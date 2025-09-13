import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import ClusterListWithWebSocket from './ClusterListWithWebSocket';

const queryClient = new QueryClient();


interface ClusterListProvidersProps {
  listId: string;
}

const ClusterListProviders: React.FC<ClusterListProvidersProps> = ({ listId }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
          <ClusterListWithWebSocket listId={listId} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

export default ClusterListProviders;
