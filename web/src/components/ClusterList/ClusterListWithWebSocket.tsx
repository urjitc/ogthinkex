import React, { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Sidebar from './Sidebar';
import BreadcrumbBar from './BreadcrumbBar';
import KanbanColumn from './KanbanColumn';
import MainPanel from './MainPanel';
import QAModal from './QAModal';
import ResearchModal from './ResearchModal';
import FlashcardModal from './FlashcardModal';
import QACard from './QACard';
import ResearchCard from './ResearchCard';
import SourceNoteCard from './SourceNoteCard';
import FlashcardCard from './FlashcardCard';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { TreeNode, BreadcrumbItem } from './types';
import { useAllClusterLists } from '../../hooks/useAllClusterLists';
import { useAnimation } from '../../hooks/use-animation';
import { useDragReorder } from '../../hooks/useDragReorder';
import { PUBLIC_API_BASE_URL } from '../../config';
import { DndContext, type DragEndEvent, type DragStartEvent, type DragCancelEvent, DragOverlay, useSensor, useSensors, PointerSensor, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// Define types directly in the component for now
export interface QAPair {
  _id: string;
  question: string;
  answer: string;
  created_at: string;
  card_type?: 'research' | 'qa' | 'source_note' | 'flashcard'; // New field to distinguish card types
  related_qas?: QAPair[]; // For research cards: multiple related Q&As
  // Source note specific fields
  source_metadata?: {
    title: string;
    url?: string;
    author?: string;
    publication_date?: string;
    source_type: 'book' | 'article' | 'pdf' | 'video' | 'website' | 'other';
  };
  source_content?: {
    summary: string;
    key_takeaways: string[];
    personal_notes: string;
    tags: string[];
  };
  // Flashcard specific fields
  flashcard_set?: {
    title: string;
    description: string;
    cards: Array<{
      id: string;
      front: string;
      back: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    }>;
    tags: string[];
    created_by?: string;
  };
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

  console.groupCollapsed('[DEBUG] Fetching cluster list data');
  console.log('Requesting cluster list ID:', listId);
  
    const response = await fetch(`${PUBLIC_API_BASE_URL}/cluster-lists/${listId}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  
  if (!response.ok) {
    console.error('Fetch error:', response.status);
    console.groupEnd();
    if (response.status === 404) return null;
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Raw API response:', JSON.parse(JSON.stringify(data)));
  console.groupEnd();
  
  return data;
};

const ClusterListWithWebSocket: React.FC<{ listId?: string }> = ({ listId: initialListId }) => {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  const { data: allClusterLists, isLoading: areListsLoading } = useAllClusterLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(initialListId || null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [animatedNodeId, setAnimatedNodeId] = useState<string | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [researchModalOpen, setResearchModalOpen] = useState<boolean>(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState<boolean>(false);
  const [selectedQAItem, setSelectedQAItem] = useState<QAPair | null>(null);
  const [selectedResearchItem, setSelectedResearchItem] = useState<QAPair | null>(null);
  const [selectedFlashcardItem, setSelectedFlashcardItem] = useState<QAPair | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'qa' | 'cluster' | 'clusterList' } | null>(null);
  const [activeDragData, setActiveDragData] = useState<{ item: QAPair; clusterTitle: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Use React Query to fetch data
  useEffect(() => {
    if (!selectedListId && allClusterLists && allClusterLists.length > 0) {
      setSelectedListId(allClusterLists[0].id);
    }
  }, [allClusterLists, selectedListId]);

  // Handle list selection with transition state
  const handleListSelection = useCallback((listId: string) => {
    if (listId === selectedListId) return;
    
    setIsTransitioning(true);
    setSelectedListId(listId);
    
    // Reset transition state after a short delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [selectedListId]);

  const { data: clusterData, isLoading, error, isFetching } = useQuery({
    queryKey: ['clusterList', selectedListId],
    queryFn: () => fetchClusterList(selectedListId),
    enabled: !!selectedListId, // Only run if a list is selected
    // Remove keepPreviousData to prevent showing old data
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  useEffect(() => {
    if (clusterData) {
      console.groupCollapsed('[DEBUG] Cluster data loaded');
      console.log('Selected list ID:', selectedListId);
      console.log('Received data:', clusterData);
      console.log('First QA ID:', clusterData?.clusters?.[0]?.qas?.[0]?._id);
      console.groupEnd();
    }
  }, [clusterData, selectedListId]);


  // Use the new drag reorder hook
  const { reorder, dragItems } = useDragReorder(clusterData || null, selectedListId);
  console.log('Drag items:', dragItems?.clusters?.map(c => ({title: c.title, qaCount: c.qas.length})));

    const deleteClusterMutation = useMutation({
    mutationFn: async (clusterName: string) => {
      if (!selectedListId) throw new Error("No list ID provided for deletion.");
      const response = await fetch(`${PUBLIC_API_BASE_URL}/cluster-lists/${selectedListId}/cluster/${encodeURIComponent(clusterName)}`, {
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
      const response = await fetch(`${PUBLIC_API_BASE_URL}/cluster-lists/${selectedListId}/qa/${qaId}?clusterName=${encodeURIComponent(clusterName)}`, {
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

  const deleteClusterListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const url = `${PUBLIC_API_BASE_URL}/cluster-lists/${listId}`;
      console.log(`[DEBUG] Attempting to delete cluster list at URL: ${url}`);
      console.log(`[DEBUG] List ID: ${listId}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] Delete failed with status ${response.status}: ${errorText}`);
        throw new Error(`Failed to delete cluster list: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[DEBUG] Delete successful:`, result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allClusterLists'] });
      // If we deleted the currently selected list, select the first available list
      if (allClusterLists && allClusterLists.length > 1) {
        const remainingLists = allClusterLists.filter(list => list.id !== itemToDelete?.id);
        if (remainingLists.length > 0) {
          setSelectedListId(remainingLists[0].id);
        } else {
          setSelectedListId(null);
        }
      } else {
        setSelectedListId(null);
      }
    },
  });



  const handleDeleteQA = (qaId: string, clusterName: string) => {
    setItemToDelete({ id: qaId, name: clusterName, type: 'qa' });
  };

  const handleDeleteCluster = (clusterName: string) => {
    setItemToDelete({ id: clusterName, name: clusterName, type: 'cluster' });
  };

  const handleDeleteClusterList = (listId: string, listName: string) => {
    setItemToDelete({ id: listId, name: listName, type: 'clusterList' });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'qa') {
      deleteQAMutation.mutate({ qaId: itemToDelete.id, clusterName: itemToDelete.name });
    } else if (itemToDelete.type === 'cluster') {
      deleteClusterMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'clusterList') {
      deleteClusterListMutation.mutate(itemToDelete.id);
    }

    setItemToDelete(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require pointer to move 8px before activating
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveDragData({
      item: active.data.current?.item,
      clusterTitle: active.data.current?.clusterTitle,
    });
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveId(null);
    setActiveDragData(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    reorder(event);
    setActiveId(null);
    setActiveDragData(null);
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
  const displayData = dragItems;

  const allItems = useMemo(() => {
    if (!displayData) return [];
    return displayData.clusters.flatMap(cluster => cluster.qas);
  }, [displayData]);

  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const { animatedItems, scrollToItemId } = useAnimation(allItems, [allItems], animationsEnabled);

  const filteredClusters = useMemo(() => {
    if (!displayData) return [];
    console.log('Filtered clusters data:', displayData.clusters);
    const q = searchQuery.trim().toLowerCase();
    
    if (!q) return displayData.clusters;

    return displayData.clusters
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
  }, [displayData, searchQuery]);

  useEffect(() => {
    if (!isLoading && !isFetching) {
      // Enable animations only after the initial data has loaded.
      setAnimationsEnabled(true);
    }
  }, [isLoading, isFetching]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

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
    if (qaItem.card_type === 'research') {
      setSelectedResearchItem(qaItem);
      setResearchModalOpen(true);
    } else if (qaItem.card_type === 'flashcard') {
      setSelectedFlashcardItem(qaItem);
      setFlashcardModalOpen(true);
    } else {
      setSelectedQAItem(qaItem);
      setModalOpen(true);
    }
  };

  const closeQAModal = () => {
    setModalOpen(false);
    setSelectedQAItem(null);
  };

  const closeResearchModal = () => {
    setResearchModalOpen(false);
    setSelectedResearchItem(null);
  };

  const closeFlashcardModal = () => {
    setFlashcardModalOpen(false);
    setSelectedFlashcardItem(null);
  };


    
  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-red-400">Error: {(error as Error).message}</div>
    </div>
  );

  return (
        <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
        onSelectList={handleListSelection}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onDeleteList={handleDeleteClusterList}
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
          {isLoading || isFetching || isTransitioning ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span>Loading cluster list...</span>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="h-full overflow-x-auto scrollbar-hide"
              style={{ scrollPaddingLeft: '1.5rem' }}
              onScroll={updateScrollbar}
            >
              <div className="flex gap-6 h-full px-6 pb-3">
                {filteredClusters.map((cluster, index) => {
                  console.log('Rendering cluster:', cluster.title, 'with', cluster.qas.length, 'QAs');
                  return (
                    <KanbanColumn 
                      key={`${cluster.title}-${selectedListId}`} 
                      cluster={cluster} 
                      onOpenQAModal={openQAModal}
                      onDeleteQA={handleDeleteQA}
                      onDeleteCluster={handleDeleteCluster}
                      isAnimated={animatedNodeId === cluster.title}
                      columnIndex={index}
                      animatedItems={animatedItems}
                    />
                  );
                })}
                <div className="flex-shrink-0 w-px" />
              </div>
            </div>
          )}
          
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

      {/* Research Modal */}
      <ResearchModal
        isOpen={researchModalOpen}
        researchItem={selectedResearchItem}
        onClose={closeResearchModal}
      />

      {/* Flashcard Modal */}
      <FlashcardModal
        isOpen={flashcardModalOpen}
        flashcardItem={selectedFlashcardItem}
        onClose={closeFlashcardModal}
      />

      <DragOverlay
        dropAnimation={{
          duration: 500,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeDragData ? (
          activeDragData.item.card_type === 'research' ? (
            <ResearchCard
              item={activeDragData.item}
              clusterTitle={activeDragData.clusterTitle}
              isOverlay={true}
              onOpenModal={() => {}}
              onDelete={() => {}}
            />
          ) : activeDragData.item.card_type === 'source_note' ? (
            <SourceNoteCard
              item={activeDragData.item}
              clusterTitle={activeDragData.clusterTitle}
              isOverlay={true}
              onOpenModal={() => {}}
              onDelete={() => {}}
            />
          ) : activeDragData.item.card_type === 'flashcard' ? (
            <FlashcardCard
              item={activeDragData.item}
              clusterTitle={activeDragData.clusterTitle}
              isOverlay={true}
              onOpenModal={() => {}}
              onDelete={() => {}}
            />
          ) : (
            <QACard
              item={activeDragData.item}
              clusterTitle={activeDragData.clusterTitle}
              isOverlay={true}
              onOpenModal={() => {}}
              onDelete={() => {}}
            />
          )
        ) : null}
      </DragOverlay>

      <DeleteConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete ${itemToDelete?.type === 'qa' ? 'Q/A Item' : itemToDelete?.type === 'cluster' ? 'Cluster' : 'Cluster List'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'qa' ? 'item' : itemToDelete?.type === 'cluster' ? 'cluster and all its content' : 'cluster list and all its content'}? This action cannot be undone.`}
      />
    </div>
    </DndContext>
  );
};

export default ClusterListWithWebSocket;
