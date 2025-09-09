import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import BreadcrumbBar from './BreadcrumbBar';
import MainPanel from './MainPanel';
import RightDrawer from './RightDrawer';
import ContextDrawer from './ContextDrawer';
import ContextToolbar from './ContextToolbar';
import type { APINode, APIGraph, TreeNode, BreadcrumbItem } from './types';

// --- Main Component ---
const KnowledgeGraph: React.FC<{ graphId: string }> = ({ graphId }) => {
  const [items, setItems] = useState<APINode[]>([]);
  const [topic, setTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState<boolean>(false);
  const [contextItems, setContextItems] = useState<APINode[]>([]);

  // Build tree structure from nodes
  const treeStructure = useMemo(() => {
    if (!items.length) return [];
    
    // Create a 3-level tree structure: root topic → subtopics → Q&A threads
    const rootNodes = items.filter(node => !node.parent_node_ids || node.parent_node_ids.length === 0);
    const childNodes = items.filter(node => node.parent_node_ids && node.parent_node_ids.length > 0);
    
    // Group children by their parent ID
    const groups: Record<string, APINode[]> = {};
    childNodes.forEach(node => {
      const parentId = node.parent_node_ids[0];
      if (!groups[parentId]) groups[parentId] = [];
      groups[parentId].push(node);
    });
    
    // Helper function to get subtopic name from question content
    const getSubtopicName = (questionText: string): string => {
      // Map common question patterns to concise subtopic names
      const lowerQuestion = questionText.toLowerCase();
      
      if (lowerQuestion.includes('calculus')) return 'Calculus';
      if (lowerQuestion.includes('algebra')) return 'Algebra';
      if (lowerQuestion.includes('derivative')) return 'Derivatives';
      if (lowerQuestion.includes('integral')) return 'Integrals';
      if (lowerQuestion.includes('limit')) return 'Limits';
      if (lowerQuestion.includes('linear equation')) return 'Linear Equations';
      if (lowerQuestion.includes('quadratic')) return 'Quadratics';
      if (lowerQuestion.includes('polynomial')) return 'Polynomials';
      if (lowerQuestion.includes('factor')) return 'Factoring';
      if (lowerQuestion.includes('system')) return 'Systems';
      if (lowerQuestion.includes('inequalit')) return 'Inequalities';
      if (lowerQuestion.includes('mathematics') || lowerQuestion.includes('math')) return 'Overview';
      
      // Fallback: use first few words
      const words = questionText.split(' ').slice(0, 3);
      return words.join(' ').replace(/[?.,!]/g, '');
    };
    
    // Helper function to build subtree recursively
    const buildSubtree = (node: APINode, level: number): TreeNode => {
      const children = groups[node._id] || [];
      
      return {
        id: node._id,
        name: level === 1 ? getSubtopicName(node.question_text) : 
              node.question_text.slice(0, 50) + (node.question_text.length > 50 ? '...' : ''),
        type: level === 1 ? 'subtopic' as const : 'thread' as const,
        children: children.map(child => buildSubtree(child, level + 1)),
        nodeIds: [node._id, ...children.flatMap(child => getAllNodeIds(child))]
      };
    };
    
    // Helper function to get all node IDs in a subtree
    const getAllNodeIds = (node: APINode): string[] => {
      const children = groups[node._id] || [];
      return [node._id, ...children.flatMap(child => getAllNodeIds(child))];
    };
    
    // Create the main tree structure
    const tree: TreeNode[] = [
      {
        id: 'root',
        name: topic || 'Knowledge Base',
        type: 'topic',
        children: rootNodes.map(rootNode => buildSubtree(rootNode, 1)),
        nodeIds: items.map(n => n._id)
      }
    ];
    
    return tree;
  }, [items, topic]);

  // Current breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!selectedNodeId) return [{ id: 'root', name: topic || 'Knowledge Base' }];
    
    // Find the path to selected node
    const findPath = (nodes: TreeNode[], targetId: string, path: Array<{ id: string; name: string }> = []): Array<{ id: string; name: string }> | null => {
      for (const node of nodes) {
        const currentPath = [...path, { id: node.id, name: node.name }];
        if (node.id === targetId) return currentPath;
        
        const found = findPath(node.children, targetId, currentPath);
        if (found) return found;
      }
      return null;
    };
    
    return findPath(treeStructure, selectedNodeId) || [{ id: 'root', name: topic || 'Knowledge Base' }];
  }, [selectedNodeId, treeStructure, topic]);

  // Get current view items based on selection
  const currentViewItems = useMemo(() => {
    if (!selectedNodeId || selectedNodeId === 'root') return items;
    
    // Find the selected node and get its nodeIds
    const findNode = (nodes: TreeNode[], targetId: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) return node;
        const found = findNode(node.children, targetId);
        if (found) return found;
      }
      return null;
    };
    
    const selectedNode = findNode(treeStructure, selectedNodeId);
    return selectedNode ? items.filter(item => selectedNode.nodeIds.includes(item._id)) : items;
  }, [selectedNodeId, treeStructure, items]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentViewItems;
    return currentViewItems.filter(item =>
      item.question_text.toLowerCase().includes(q) ||
      item.answer_text.toLowerCase().includes(q)
    );
  }, [currentViewItems, searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/graphs/${graphId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data: APIGraph = await response.json();
        setItems(data.nodes || []);
        setTopic(data.topic || '');
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [graphId]);

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
  };

  const openCardDetail = (cardId: string) => {
    setSelectedCardId(cardId);
    setRightDrawerOpen(true);
  };

  const closeDrawer = () => {
    setRightDrawerOpen(false);
    setSelectedCardId(null);
  };

  const selectedCard = selectedCardId ? items.find(item => item._id === selectedCardId) || null : null;

  const handleToggleContextDrawer = () => {
    setIsContextDrawerOpen(prev => !prev);
  };

  const handleCloseContextDrawer = () => {
    setIsContextDrawerOpen(false);
  };

  const handleAddItemToContext = (item: APINode) => {
    setContextItems(prev => {
      if (prev.find(i => i._id === item._id)) {
        return prev; // Item already exists
      }
      return [...prev, item];
    });
    // Optionally open the drawer when an item is added
    setIsContextDrawerOpen(true);
  };

  const handleRemoveItemFromContext = (itemId: string) => {
    setContextItems(prev => prev.filter(i => i._id !== itemId));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-600">Loading knowledge base...</div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-red-600">Error: {error}</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar
        treeStructure={treeStructure}
        expandedNodes={expandedNodes}
        selectedNodeId={selectedNodeId}
        searchQuery={searchQuery}
        sidebarCollapsed={sidebarCollapsed}
        onToggleNode={toggleNodeExpanded}
        onSelectNode={selectNode}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <BreadcrumbBar
          breadcrumbPath={breadcrumbPath}
          filteredItemsCount={filteredItems.length}
          viewMode={viewMode}
          onSelectNode={selectNode}
          onViewModeChange={setViewMode}
        />

        {/* Main Panel */}
        <MainPanel
          viewMode={viewMode}
          filteredItems={filteredItems}
          searchQuery={searchQuery}
          onOpenCardDetail={openCardDetail}
          onAddItemToContext={handleAddItemToContext}
        />
      </div>

      {/* Right Drawer */}
      <RightDrawer
        isOpen={rightDrawerOpen}
        selectedCard={selectedCard}
        topic={topic}
        allItems={items}
        onClose={closeDrawer}
      />

      {/* Context Drawer & Toolbar */}
      <ContextToolbar 
        onToggleDrawer={handleToggleContextDrawer}
        contextItemCount={contextItems.length}
      />
      <ContextDrawer
        isOpen={isContextDrawerOpen}
        onClose={handleCloseContextDrawer}
        contextItems={contextItems}
        onRemoveItem={handleRemoveItemFromContext}
      />
    </div>
  );
};

export default KnowledgeGraph;
