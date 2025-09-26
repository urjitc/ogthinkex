import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WebSocketProvider } from '../../contexts/WebSocketContext';
import ClusterListWithWebSocket from './ClusterListWithWebSocket';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000, // Data is fresh for 5 seconds
    },
  },
});

interface ClusterListWrapperProps {
  graphId?: string;
}

const ClusterListWrapper: React.FC<ClusterListWrapperProps> = ({ graphId }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <ClusterListWithWebSocket listId={graphId} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

export default ClusterListWrapper;
