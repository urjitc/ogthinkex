import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Ably from "ably";

interface AblyContextType {
  connection: Ably.Realtime | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const AblyContext = createContext<AblyContextType | null>(null);

interface AblyProviderProps {
  children: ReactNode;
}

export function AblyProvider({ children }: AblyProviderProps) {
  const [connection, setConnection] = useState<Ably.Realtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    let ablyConnection: Ably.Realtime;

    const initializeAbly = async () => {
      try {
        // Create Ably connection using the token request endpoint
        ablyConnection = new Ably.Realtime({ 
          authUrl: `/.netlify/functions/ably-token-request?clientId=thinkex-client-${Date.now()}` 
        });
        
        setConnection(ablyConnection);

        // Listen for connection state changes
        ablyConnection.connection.on('connected', () => {
          console.log('Ably connected');
          setIsConnected(true);
          if (reconnectIntervalRef.current) {
            clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = null;
          }
        });

        ablyConnection.connection.on('disconnected', () => {
          console.log('Ably disconnected');
          setIsConnected(false);
        });

        ablyConnection.connection.on('failed', (error: any) => {
          console.error('Ably connection failed:', error);
          setIsConnected(false);
          
          // Start reconnection attempts
          if (!reconnectIntervalRef.current) {
            console.log('Starting reconnection polling every 5 seconds...');
            reconnectIntervalRef.current = setInterval(() => {
              console.log('Attempting to reconnect...');
              setReconnectAttempt((prev) => prev + 1);
            }, 5000);
          }
        });

        // Get the channel for knowledge graph updates
        const channel = ablyConnection.channels.get("knowledge-graph-updates");
        channelRef.current = channel;

        // Subscribe to server updates from the backend
        await channel.subscribe('server-update', (msg: Ably.Message) => {
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

      } catch (error) {
        console.error('Error initializing Ably:', error);
        setIsConnected(false);
      }
    };

    initializeAbly();

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (ablyConnection) {
        ablyConnection.close();
      }
    };
  }, [queryClient, reconnectAttempt]);

  const sendMessage = (message: any) => {
    if (channelRef.current && isConnected) {
      channelRef.current.publish("client-message", message);
    } else {
      console.warn('Ably is not connected');
    }
  };

  const value: AblyContextType = {
    connection,
    isConnected,
    sendMessage
  };

  return (
    <AblyContext.Provider value={value}>
      {children}
    </AblyContext.Provider>
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
