import React, { useRef, useEffect } from 'react';
import { FaFolder, FaFile, FaLink, FaQuestion } from 'react-icons/fa';
import type { TreeNode } from './types';

interface SidebarProps {
  treeStructure: TreeNode[];
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  animatedNodeId?: string | null;
  searchQuery: string;
  sidebarCollapsed: boolean;
  onToggleNode: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSearchChange: (query: string) => void;
  onToggleSidebar: () => void;
}

// --- TreeNode Component for Sidebar ---
const TreeNodeComponent: React.FC<{
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  animatedNodeId?: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}> = ({ node, level, expandedNodes, selectedNodeId, onToggle, onSelect, animatedNodeId }) => {
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodes.has(node.id);
  const selected = selectedNodeId === node.id;
  const [isClicked, setIsClicked] = React.useState(false);
  
  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    if (selected && hasChildren) {
      onToggle(node.id);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
          node.id === animatedNodeId ? 'animate-glow' : ''
        } ${
          isClicked
            ? 'bg-blue-900 text-blue-200 border border-blue-800'
            : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
        }`}
        style={{ paddingLeft: `${level * 32 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="mr-2 p-0.5 hover:bg-gray-600 rounded text-gray-400 hover:text-gray-200"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center flex-1 min-w-0">
          <div className={`mr-2 ${
            node.type === 'topic' ? 'text-blue-400' :
            node.type === 'subtopic' ? 'text-gray-400' :
            'text-gray-500'
          }`}>
            {node.type === 'topic' && <FaFolder className="w-4 h-4" />}
            {node.type === 'subtopic' && <FaFile className="w-4 h-4" />}
            {node.type === 'thread' && (hasChildren ? <FaLink className="w-4 h-4" /> : <FaQuestion className="w-4 h-4" />)}
          </div>
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.nodeIds.length > 0 && !(node.type === 'thread' && !hasChildren) && (
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">
            {node.nodeIds.length}
          </span>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              animatedNodeId={animatedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Sidebar Component ---
const Sidebar: React.FC<SidebarProps> = ({
  treeStructure,
  expandedNodes,
  selectedNodeId,
  animatedNodeId,
  searchQuery,
  sidebarCollapsed,
  onToggleNode,
  onSelectNode,
  onSearchChange,
  onToggleSidebar,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K on Mac or Ctrl+K on Windows/Linux
      if ((event.metaKey && isMac) || (event.ctrlKey && !isMac)) {
        if (event.key === 'k' || event.key === 'K') {
          event.preventDefault();
          if (sidebarCollapsed) {
            // Open sidebar and focus search
            onToggleSidebar();
            setTimeout(() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }, 300);
          } else if (searchInputRef.current) {
            // Just focus search if sidebar is already open
            searchInputRef.current.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMac, sidebarCollapsed, onToggleSidebar]);
  return (
    <div
      className={`h-screen bg-zinc-950 border-r border-gray-700 transition-all duration-300 flex flex-col ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* --- Header --- */}
      <div
        className={`flex items-center h-16 px-4 border-b border-gray-700 flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        <div
          className={`flex items-center space-x-2 overflow-hidden transition-all duration-300 ${
            sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
          }`}
        >
          <img
            src="/logo.png"
            alt="ThinkEx Logo"
            className="w-5 h-9 rounded-lg object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg items-center justify-center hidden">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-100 whitespace-nowrap">ThinkEx</h2>
        </div>

        <button
          onClick={onToggleSidebar}
          className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${
              sidebarCollapsed ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* --- Search Area --- */}
      <div className="px-3 py-4 flex-shrink-0">
        <div className="relative h-10">
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              sidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-3'
            }`}
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            ref={searchInputRef}
            type="text"
            placeholder={sidebarCollapsed ? '' : 'Search...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClick={() => {
              if (sidebarCollapsed) {
                onToggleSidebar();
                setTimeout(() => searchInputRef.current?.focus(), 300);
              }
            }}
            className={`w-full h-full text-sm rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent search-focus-glow transition-all duration-300 ${
              sidebarCollapsed
                ? 'bg-transparent border-transparent cursor-pointer'
                : 'bg-gray-700 border border-gray-600 pl-10 pr-16'
            }`}
          />

          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2 pointer-events-none transition-opacity duration-300 ${
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span className="text-sm text-gray-400 font-mono">{shortcutKey}</span>
          </div>
        </div>
      </div>

      {/* --- Tree Navigation --- */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden px-4 transition-all duration-300 ${
          sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
        }`}
      >
        <div className="space-y-1 pb-4">
          {treeStructure.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              level={0}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              animatedNodeId={animatedNodeId}
              onToggle={onToggleNode}
              onSelect={onSelectNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
