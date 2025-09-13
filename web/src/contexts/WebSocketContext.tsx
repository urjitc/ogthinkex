import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Ably from "ably";
import { AblyProvider as AblyReactProvider, ChannelProvider, useAbly as useAblyHook, useChannel, useConnectionStateListener } from 'ably/react';

// Create Ably client with token authentication
const createAblyClient = () => {
  const clientId = `thinkex-client-${Date.now()}`;
  const authUrl = `https://thinkex.onrender.com/ably-token-request?clientId=${clientId}`;
  
  console.log('🔧 Creating Ably client with:', { clientId, authUrl });
  
  // The Ably SDK will automatically handle token fetching and renewal via authUrl.
  return new Ably.Realtime({ 
    authUrl,
    log: {
      level: 4, // Verbose logging
      handler: (msg: any) => {
        console.log(`🔍 Ably Log [${msg.level}]:`, msg.msg);
      }
    }
  });
};

interface AblyContextType {
  connection: Ably.Realtime | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const AblyContext = createContext<AblyContextType | null>(null);

// Component that handles real-time updates using Ably's useChannel hook
function AblyRealtimeHandler({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const ably = useAblyHook();
  const [isConnected, setIsConnected] = useState(false);

  // Listen for connection state changes
  useConnectionStateListener((stateChange) => {
    const connected = stateChange.current === 'connected';
    setIsConnected(connected);
    console.log('🔄 Ably connection state changed:', {
      previous: stateChange.previous,
      current: stateChange.current,
      event: stateChange.event,
      reason: stateChange.reason,
      retryIn: stateChange.retryIn
    });
    
    if (stateChange.reason) {
      console.log('🔄 Connection change reason:', stateChange.reason);
    }
    
    if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
      console.error('❌ Ably connection failed/suspended:', stateChange);
    }
    
    if (stateChange.current === 'connected') {
      console.log('✅ Ably successfully connected');
    }
  });

  // Subscribe to knowledge graph updates channel
  const { publish } = useChannel('cluster-list-updates', 'server-update', (msg) => {
    try {
      console.log('📨 Received Ably message:', {
        name: msg.name,
        data: msg.data,
        timestamp: msg.timestamp,
        clientId: msg.clientId,
        connectionId: msg.connectionId
      });
      const data = msg.data;

      switch (data.type) {
        case 'cluster_list_update':
          queryClient.invalidateQueries({ queryKey: ['clusterList'] });
          break;
        case 'node_update':
          queryClient.setQueryData(['knowledgeGraph'], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              nodes: oldData.nodes.map((node: any) =>
                node._id === data.payload._id ? { ...node, ...data.payload } : node
              ),
            };
          });
          break;
        case 'new_node':
          queryClient.setQueryData(['knowledgeGraph'], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              nodes: [...oldData.nodes, data.payload],
            };
          });
          break;
        default:
          console.log('❓ Unknown message type:', data.type, 'Full data:', data);
      }
    } catch (error) {
      console.error('❌ Error processing Ably message:', error, 'Message:', msg);
    }
  });

  const sendMessage = (message: any) => {
    console.log('📤 Attempting to send message:', message, 'Connected:', isConnected);
    if (isConnected) {
      try {
        publish("client-message", message);
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send message - Ably is not connected');
    }
  };

  const value: AblyContextType = {
    connection: ably,
    isConnected,
    sendMessage
  };

  return (
    <AblyContext.Provider value={value}>
      {children}
    </AblyContext.Provider>
  );
}

// Main provider that wraps the official AblyProvider
export function AblyProvider({ children }: { children: ReactNode }) {
  console.log('🏗️ Creating AblyProvider component');
  const ablyClient = createAblyClient();
  console.log('🏗️ Ably client created, wrapping with providers');

  return (
    <AblyReactProvider client={ablyClient}>
      <ChannelProvider channelName="cluster-list-updates">
        <AblyRealtimeHandler>
          {children}
        </AblyRealtimeHandler>
      </ChannelProvider>
    </AblyReactProvider>
  );
}

export function useAbly() {
  const context = useContext(AblyContext);
  if (!context) {
    throw new Error('useAbly must be used within an AblyProvider');
  }
  return context;
}

// Legacy exports for backward compatibility
export const WebSocketProvider = AblyProvider;
export const useWebSocket = useAbly;
