import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import ClusterListWithWebSocket from './ClusterListWithWebSocket';

const queryClient = new QueryClient();


interface ClusterListProvidersProps {}

const ClusterListProviders: React.FC<ClusterListProvidersProps> = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
          <ClusterListWithWebSocket />
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

export default ClusterListProviders;
