import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Sidebar from './Sidebar';
import BreadcrumbBar from './BreadcrumbBar';
import KanbanColumn from './KanbanColumn';
import MainPanel from './MainPanel';
import QAModal from './QAModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { TreeNode, BreadcrumbItem } from './types';
import { useAllClusterLists } from '../../hooks/useAllClusterLists';
import { useAnimation } from '../../hooks/use-animation';

// Define types directly in the component for now
export interface QAPair {
  _id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface Cluster {
  title: string;
  qas: QAPair[];
}

export interface ClusterList {
  id: string;
  title: string;
  clusters: Cluster[];
}

// Fetch function for React Query
const fetchClusterList = async (listId: string | null): Promise<ClusterList | null> => {
  if (!listId) return null;

  const response = await fetch(`https://thinkex.onrender.com/cluster-lists/${listId}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Handle case where listId doesn't exist
    }
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
};

const ClusterListWithWebSocket: React.FC<{ listId?: string }> = ({ listId: initialListId }) => {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  const { data: allClusterLists, isLoading: areListsLoading } = useAllClusterLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(initialListId || null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [animatedNodeId, setAnimatedNodeId] = useState<string | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedQAItem, setSelectedQAItem] = useState<QAPair | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'qa' | 'cluster' } | null>(null);

  // Use React Query to fetch data
  useEffect(() => {
    if (!selectedListId && allClusterLists && allClusterLists.length > 0) {
      setSelectedListId(allClusterLists[0].id);
    }
  }, [allClusterLists, selectedListId]);

  const { data: clusterData, isLoading, error } = useQuery({
    queryKey: ['clusterList', selectedListId],
    queryFn: () => fetchClusterList(selectedListId),
    enabled: !!selectedListId, // Only run if a list is selected
    placeholderData: keepPreviousData,
  });

    const deleteClusterMutation = useMutation({
    mutationFn: async (clusterName: string) => {
      if (!selectedListId) throw new Error("No list ID provided for deletion.");
      const response = await fetch(`https://thinkex.onrender.com/cluster-lists/${selectedListId}/cluster/${encodeURIComponent(clusterName)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete cluster');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusterList', selectedListId] });
    },
  });

  const deleteQAMutation = useMutation({
    mutationFn: async ({ qaId, clusterName }: { qaId: string; clusterName: string }) => {
      if (!selectedListId) throw new Error("No list ID provided for deletion.");
      const response = await fetch(`https://thinkex.onrender.com/cluster-lists/${selectedListId}/qa/${qaId}?clusterName=${encodeURIComponent(clusterName)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete Q/A item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusterList', selectedListId] });
    },
  });

    const handleDeleteQA = (qaId: string, clusterName: string) => {
    setItemToDelete({ id: qaId, name: clusterName, type: 'qa' });
  };

  const handleDeleteCluster = (clusterName: string) => {
    setItemToDelete({ id: clusterName, name: clusterName, type: 'cluster' });
  };

    const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'qa') {
      deleteQAMutation.mutate({ qaId: itemToDelete.id, clusterName: itemToDelete.name });
    } else if (itemToDelete.type === 'cluster') {
      deleteClusterMutation.mutate(itemToDelete.id);
    }

    setItemToDelete(null);
  };

  const sidebarStructure = useMemo(() => {
    if (!allClusterLists) return [];

    return allClusterLists.map((list: ClusterList) => ({
      id: list.id,
      name: list.title,
      type: 'topic' as const,
      children: (list.id === selectedListId && clusterData)
        ? clusterData.clusters.map(cluster => ({
            id: cluster.title, // Keep using title for cluster ID within the sidebar
            name: cluster.title,
            type: 'subtopic' as const,
            children: [],
            nodeIds: [], // This can be populated if needed later
          }))
        : [],
      nodeIds: [],
    }));
  }, [allClusterLists, selectedListId, clusterData]);

  // Breadcrumb path for the new structure
  const breadcrumbPath = useMemo(() => {
    if (!clusterData) return [];
    const path: BreadcrumbItem[] = [{ id: clusterData.id, name: clusterData.title || 'Topic' }];
    return path;
  }, [clusterData]);

  // Filter clusters and QAs based on search
  const allItems = useMemo(() => {
    if (!clusterData) return [];
    return clusterData.clusters.flatMap(cluster => cluster.qas);
  }, [clusterData]);

  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const { animatedItems, scrollToItemId } = useAnimation(allItems, [allItems], animationsEnabled);

  const filteredClusters = useMemo(() => {
    if (!clusterData) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clusterData.clusters;

    return clusterData.clusters
      .map(cluster => {
        const filteredQas = cluster.qas.filter(
          qa =>
            qa.question.toLowerCase().includes(q) ||
            qa.answer.toLowerCase().includes(q)
        );

        if (cluster.title.toLowerCase().includes(q) || filteredQas.length > 0) {
          return { ...cluster, qas: filteredQas };
        }
        return null;
      })
      .filter((cluster): cluster is Cluster => cluster !== null);
  }, [clusterData, searchQuery]);

  useEffect(() => {
    if (!isLoading) {
      // Enable animations only after the initial data has loaded.
      setAnimationsEnabled(true);
    }
  }, [isLoading]);

  // Effect for scrolling to a selected cluster from the sidebar
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== 'root') {
      const element = document.getElementById(`cluster-${selectedNodeId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    }
  }, [selectedNodeId]);

  // Effect for scrolling to a new or updated card
  useEffect(() => {
    if (scrollToItemId && clusterData) {
      const targetCluster = clusterData.clusters.find(c => c.qas.some(qa => qa._id === scrollToItemId));
      if (!targetCluster) return;

      const clusterElement = document.getElementById(`cluster-${targetCluster.title}`);
      const cardElement = document.getElementById(`qa-card-${scrollToItemId}`);

      if (clusterElement && cardElement) {
        clusterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        const columnScrollContainer = clusterElement.querySelector('.custom-scrollbar');
        if (columnScrollContainer) {
          setTimeout(() => {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500); 
        }
      }
    }
  }, [scrollToItemId, clusterData]);

  // Function to update the custom scrollbar's size and position
  const updateScrollbar = () => {
    if (!scrollContainerRef.current) return;

    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollWidth, clientWidth, scrollLeft } = container;

      const progressBar = document.querySelector('.custom-scrollbar-thumb') as HTMLElement;
      if (progressBar) {
        if (scrollWidth <= clientWidth) {
          // Hide scrollbar if content doesn't overflow
          progressBar.style.width = '0px';
          return;
        }
        
        const trackWidth = clientWidth;
        const thumbWidth = Math.max(40, (clientWidth / scrollWidth) * trackWidth);
        const scrollPercentage = scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0;
        const thumbPosition = scrollPercentage * (trackWidth - thumbWidth);

        progressBar.style.width = `${thumbWidth}px`;
        progressBar.style.transform = `translateX(${thumbPosition}px)`;
      }
    });
  };

  // Update scrollbar using a polling mechanism for maximum robustness
  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastScrollWidth = 0;
    let stableChecks = 0;
    const maxStableChecks = 3; // Require 3 stable checks before stopping
    let intervalId: NodeJS.Timeout;

    const ensureScrollbarIsCorrect = () => {
      updateScrollbar();
      const currentScrollWidth = scrollContainer.scrollWidth;

      if (currentScrollWidth === lastScrollWidth && currentScrollWidth > 0) {
        stableChecks++;
      } else {
        stableChecks = 0;
      }

      lastScrollWidth = currentScrollWidth;

      if (stableChecks >= maxStableChecks) {
        clearInterval(intervalId);
      }
    };

    // Poll every 50ms for a short period to find the stable scrollWidth
    intervalId = setInterval(ensureScrollbarIsCorrect, 50);

    // Stop polling after a timeout to prevent infinite loops
    const timeoutId = setTimeout(() => clearInterval(intervalId), 2000);

    // Cleanup on component unmount
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [clusterData]); // Rerun if the core data changes


  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    setAnimatedNodeId(nodeId);

    animationTimerRef.current = setTimeout(() => {
      setAnimatedNodeId(null);
    }, 1500);
  };


  const openQAModal = (qaItem: QAPair) => {
    setSelectedQAItem(qaItem);
    setModalOpen(true);
  };

  const closeQAModal = () => {
    setModalOpen(false);
    setSelectedQAItem(null);
  };


    
  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-red-400">Error: {(error as Error).message}</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900">

      <style>
        {`
          
          .search-focus-glow:focus {
            box-shadow: inset 0 0 0px #3b82f6, inset 0 0 20px #3b82f680;
            border-color: #3b82f6;
            animation: glow-to-blue 0.8s ease-in-out forwards;
          }
          
          @keyframes glow-to-blue {
            0% { 
              box-shadow: inset 0 0 0px #3b82f6, inset 0 0 0px #3b82f6;
              border-color: #6b7280;
            }
            50% { 
              box-shadow: inset 0 0 0px #3b82f6, inset 0 0 20px #3b82f680;
              border-color: #3b82f6;
            }
            100% { 
              box-shadow: inset 0 0 0px #3b82f6, inset 0 0 20px #3b82f680;
              border-color: #3b82f6;
            }
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          @keyframes pulse-live {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { transform: scale(1.1); box-shadow: 0 0 3px 1px rgba(16, 185, 129, 0.5); }
          }
          .animate-pulse-live {
            animation: pulse-live 2s infinite;
          }

          @keyframes card-new-animation {
            0% {
              opacity: 0;
              transform: translateY(10px);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 15px 3px rgba(59, 130, 246, 0.4);
            }
            100% {
              transform: translateY(0);
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
          }
          .animate-card-new {
            animation: card-new-animation 1.5s ease-out;
          }

          @keyframes card-updated-animation {
            0%, 100% {
              background-color: var(--tw-bg-opacity, 1) 0.05;
            }
            50% {
              background-color: #3f3f46; 
            }
          }
          .animate-card-updated {
            animation: card-updated-animation 1.5s ease-out;
          }
        `}
      </style>

      {/* Left Sidebar */}
            <Sidebar
        treeStructure={sidebarStructure}
        expandedNodes={expandedNodes}
        selectedNodeId={selectedNodeId}
        selectedListId={selectedListId}
        animatedNodeId={animatedNodeId}
        searchQuery={searchQuery}
        sidebarCollapsed={sidebarCollapsed}
        onToggleNode={toggleNodeExpanded}
        onSelectNode={selectNode}
        onSelectList={setSelectedListId}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Breadcrumb Bar */}
        <BreadcrumbBar
          breadcrumbPath={breadcrumbPath}
          filteredItemsCount={filteredClusters.reduce((acc, c) => acc + c.qas.length, 0)}
          onSelectNode={selectNode}
          isConnected={isConnected}
        />

        {/* Kanban Board */}
        <div className="flex-1 flex flex-col min-h-0 pt-3 pb-2 bg-zinc-950/50 relative">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-x-auto scrollbar-hide"
            style={{ scrollPaddingLeft: '1.5rem' }}
            onScroll={updateScrollbar}
          >
            <div className="flex gap-6 h-full px-6 pb-3">
              {filteredClusters.map((cluster, index) => (
                                                <KanbanColumn 
                  key={cluster.title} 
                  cluster={cluster} 
                  onOpenQAModal={openQAModal}
                  onDeleteQA={handleDeleteQA}
                  onDeleteCluster={handleDeleteCluster}
                  isAnimated={animatedNodeId === cluster.title}
                  columnIndex={index}
                  animatedItems={animatedItems}
                />
              ))}
              <div className="flex-shrink-0 w-px" />
            </div>
          </div>
          
          {/* Custom Always-Visible Scrollbar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800 rounded-full">
            <div className="custom-scrollbar-thumb h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-150 ease-out hover:from-blue-400 hover:to-indigo-400 cursor-pointer"></div>
          </div>
        </div>
      </div>


      {/* QA Modal */}
            <QAModal
        isOpen={modalOpen}
        qaItem={selectedQAItem}
        onClose={closeQAModal}
      />

      <DeleteConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete ${itemToDelete?.type === 'qa' ? 'Q/A Item' : 'Cluster'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'qa' ? 'item' : `cluster and all its content`}? This action cannot be undone.`}
      />
    </div>
  );
};

export default ClusterListWithWebSocket;
