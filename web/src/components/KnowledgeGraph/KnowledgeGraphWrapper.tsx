import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WebSocketProvider } from '../../contexts/WebSocketContext';
import KnowledgeGraphWithWebSocket from './KnowledgeGraphWithWebSocket';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000, // Data is fresh for 5 seconds
    },
  },
});

interface KnowledgeGraphWrapperProps {
  graphId?: string;
}

const KnowledgeGraphWrapper: React.FC<KnowledgeGraphWrapperProps> = ({ graphId }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <KnowledgeGraphWithWebSocket graphId={graphId} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

export default KnowledgeGraphWrapper;
