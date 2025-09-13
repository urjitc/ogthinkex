import { useQuery } from '@tanstack/react-query';
import type { ClusterList } from '../components/ClusterList/ClusterListWithWebSocket';

const fetchAllClusterLists = async (): Promise<ClusterList[]> => {
  const response = await fetch('https://thinkex.onrender.com/cluster-lists', {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch cluster lists');
  }
  return response.json();
};

export const useAllClusterLists = () => {
  return useQuery<ClusterList[], Error>({
    queryKey: ['allClusterLists'],
    queryFn: fetchAllClusterLists,
  });
};
