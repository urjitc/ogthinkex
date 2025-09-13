import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Ably from "ably";
import { AblyProvider as AblyReactProvider, useAbly as useAblyHook, useChannel, useConnectionStateListener } from 'ably/react';

// Create Ably client with token authentication
const createAblyClient = () => {
  return new Ably.Realtime({ 
    authUrl: `/.netlify/functions/ably-token-request?clientId=thinkex-client-${Date.now()}` 
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
    console.log('Ably connection state:', stateChange.current);
  });

  // Subscribe to knowledge graph updates channel
  const { publish } = useChannel('knowledge-graph-updates', 'server-update', (msg) => {
    try {
      console.log('Received Ably message:', msg);
      const data = msg.data;

      switch (data.type) {
        case 'knowledge_graph_update':
          queryClient.invalidateQueries({ queryKey: ['knowledgeGraph'] });
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
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing Ably message:', error);
    }
  });

  const sendMessage = (message: any) => {
    if (isConnected) {
      publish("client-message", message);
    } else {
      console.warn('Ably is not connected');
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
  const ablyClient = createAblyClient();

  return (
    <AblyReactProvider client={ablyClient}>
      <AblyRealtimeHandler>
        {children}
      </AblyRealtimeHandler>
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
