import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { QAPair, ClusterList } from '../components/ClusterList/ClusterListWithWebSocket';
import { PUBLIC_API_BASE_URL } from '../config';

interface DragReorderOutcome {
  reordered: ClusterList;
  updates: {
    type: 'move' | 'reorder';
    qaId: string;
    newClusterTitle?: string;
    clusterTitle?: string;
    orderedQaIds?: string[];
  };
}

export const useDragReorder = (clusterData: ClusterList | null, selectedListId: string | null) => {
  const client = useQueryClient();
  const [tempClusterData, setTempClusterData] = useState<ClusterList | null>(null);

  const moveQAMutation = useMutation({
    mutationFn: async ({ qaId, newClusterTitle }: { qaId: string; newClusterTitle: string }) => {
      if (!selectedListId) throw new Error("No list ID selected.");
      
      const url = `${PUBLIC_API_BASE_URL}/cluster-lists/${selectedListId}/qa/${qaId}/move`;
      const requestBody = { new_cluster_title: newClusterTitle };
      
      console.log('[DEBUG] Move Q/A Request:', {
        url,
        method: 'PATCH',
        body: requestBody,
        selectedListId,
        qaId,
        newClusterTitle
      });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[DEBUG] Move Q/A Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('[DEBUG] Error response data:', errorData);
        } catch (e) {
          console.error('[DEBUG] Could not parse error response as JSON');
        }
        throw new Error(`Failed to move Q/A item: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[DEBUG] Move Q/A Success:', result);
      return result;
    },
    onMutate: async ({ qaId, newClusterTitle }) => {
      await client.cancelQueries({ queryKey: ['clusterList', selectedListId] });
      const previousClusterList = client.getQueryData<ClusterList>(['clusterList', selectedListId]);

      client.setQueryData<ClusterList | undefined>(['clusterList', selectedListId], (oldData) => {
        if (!oldData) return undefined;
        let draggedItem: QAPair | null = null;
        const newClusters = oldData.clusters.map(cluster => {
          const qas = cluster.qas.filter(qa => {
            if (qa._id === qaId) {
              draggedItem = qa;
              return false;
            }
            return true;
          });
          return { ...cluster, qas };
        });
        if (draggedItem) {
          const destCluster = newClusters.find(c => c.title === newClusterTitle);
          if (destCluster) destCluster.qas.push(draggedItem);
        }
        return { ...oldData, clusters: newClusters };
      });

      return { previousClusterList };
    },
    onError: (err, variables, context) => {
      if (context?.previousClusterList) {
        client.setQueryData(['clusterList', selectedListId], context.previousClusterList);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['clusterList', selectedListId] });
    },
  });

  const reorderQAMutation = useMutation({
    mutationFn: async ({ clusterTitle, orderedQaIds }: { clusterTitle: string; orderedQaIds: string[] }) => {
      if (!selectedListId) throw new Error("No list ID selected.");
      const response = await fetch(`${PUBLIC_API_BASE_URL}/cluster-lists/${selectedListId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_title: clusterTitle, ordered_qa_ids: orderedQaIds }),
      });
      if (!response.ok) throw new Error('Failed to reorder Q/A items');
      return response.json();
    },
    onMutate: async ({ clusterTitle, orderedQaIds }) => {
      await client.cancelQueries({ queryKey: ['clusterList', selectedListId] });
      const previousClusterList = client.getQueryData<ClusterList>(['clusterList', selectedListId]);

      client.setQueryData<ClusterList | undefined>(['clusterList', selectedListId], (oldData) => {
        if (!oldData) return undefined;

        const newClusters = oldData.clusters.map(cluster => {
          if (cluster.title === clusterTitle) {
            const qaMap = new Map(cluster.qas.map(qa => [qa._id, qa]));
            const reorderedQas = orderedQaIds.map(id => qaMap.get(id)).filter((qa): qa is QAPair => !!qa);
            return { ...cluster, qas: reorderedQas };
          }
          return cluster;
        });

        return { ...oldData, clusters: newClusters };
      });

      return { previousClusterList };
    },
    onError: (err, variables, context) => {
      if (context?.previousClusterList) {
        client.setQueryData(['clusterList', selectedListId], context.previousClusterList);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['clusterList', selectedListId] });
    },
  });

  const handleDragReorder = useCallback((event: DragEndEvent, currentData: ClusterList): DragReorderOutcome | null => {
    const { active, over } = event;
    
    if (!over || !currentData) return null;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeClusterTitle = active.data.current?.clusterTitle as string;
    const overClusterTitle = over.data.current?.clusterTitle || over.id as string;

    if (activeClusterTitle === overClusterTitle) {
      // Reordering within the same cluster
      if (activeId === overId) return null;

      const cluster = currentData.clusters.find(c => c.title === activeClusterTitle);
      if (!cluster) return null;

      const oldIndex = cluster.qas.findIndex(qa => qa._id === activeId);
      const newIndex = cluster.qas.findIndex(qa => qa._id === overId);

      if (oldIndex === -1 || newIndex === -1) return null;

      const reorderedQas = arrayMove(cluster.qas, oldIndex, newIndex);
      const newClusters = currentData.clusters.map(c => 
        c.title === activeClusterTitle ? { ...c, qas: reorderedQas } : c
      );

      return {
        reordered: { ...currentData, clusters: newClusters },
        updates: {
          type: 'reorder',
          qaId: activeId,
          clusterTitle: activeClusterTitle,
          orderedQaIds: reorderedQas.map(qa => qa._id),
        }
      };
    } else {
      // Moving to a different cluster
      let draggedItem: QAPair | null = null;
      const sourceCluster = currentData.clusters.find(c => c.title === activeClusterTitle);
      
      if (sourceCluster) {
        const itemIndex = sourceCluster.qas.findIndex(qa => qa._id === activeId);
        if (itemIndex > -1) {
          draggedItem = sourceCluster.qas[itemIndex];
        }
      }

      if (!draggedItem) return null;

      // Remove from old cluster and add to new cluster
      const newClusters = currentData.clusters.map(c => {
        if (c.title === activeClusterTitle) {
          return { ...c, qas: c.qas.filter(qa => qa._id !== activeId) };
        }
        if (c.title === overClusterTitle) {
          return { ...c, qas: [...c.qas, draggedItem!] };
        }
        return c;
      });

      return {
        reordered: { ...currentData, clusters: newClusters },
        updates: {
          type: 'move',
          qaId: activeId,
          newClusterTitle: overClusterTitle,
        }
      };
    }
  }, []);

  const reorder = useCallback(
    async (event: DragEndEvent) => {
      if (!clusterData) return;

      const outcome = handleDragReorder(event, clusterData);
      if (!outcome) return;

      setTempClusterData(outcome.reordered);
      
      try {
        if (outcome.updates.type === 'move') {
          await moveQAMutation.mutateAsync({
            qaId: outcome.updates.qaId,
            newClusterTitle: outcome.updates.newClusterTitle!,
          });
        } else {
          await reorderQAMutation.mutateAsync({
            clusterTitle: outcome.updates.clusterTitle!,
            orderedQaIds: outcome.updates.orderedQaIds!,
          });
        }
      } finally {
        setTempClusterData(null);
      }
    },
    [clusterData, handleDragReorder, moveQAMutation, reorderQAMutation]
  );

  return {
    reorder,
    // Critical - pass this to components for rendering during drag operations
    dragItems: tempClusterData ?? clusterData,
  };
};
