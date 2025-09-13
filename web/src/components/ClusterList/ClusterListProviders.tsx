import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import ClusterListWithWebSocket from './ClusterListWithWebSocket';

const queryClient = new QueryClient();


interface ClusterListProvidersProps {
  graphId: string;
}

const ClusterListProviders: React.FC<ClusterListProvidersProps> = ({ graphId }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
          <ClusterListWithWebSocket graphId={graphId} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

export default ClusterListProviders;
