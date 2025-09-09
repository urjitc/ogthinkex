import React from 'react';
import type { TreeNode } from './types';

interface SidebarProps {
  treeStructure: TreeNode[];
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
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
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}> = ({ node, level, expandedNodes, selectedNodeId, onToggle, onSelect }) => {
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodes.has(node.id);
  const selected = selectedNodeId === node.id;
  
  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm ${
          selected
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (selected && hasChildren) {
            onToggle(node.id);
          } else {
            onSelect(node.id);
          }
        }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="mr-2 p-0.5 hover:bg-gray-200 rounded"
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
            node.type === 'topic' ? 'text-indigo-600' :
            node.type === 'subtopic' ? 'text-gray-600' :
            'text-gray-500'
          }`}>
            {node.type === 'topic' && '📁'}
            {node.type === 'subtopic' && '📄'}
            {node.type === 'thread' && (hasChildren ? '🔗' : '❓')}
          </div>
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.nodeIds.length > 0 && !(node.type === 'thread' && !hasChildren) && (
          <span className="ml-2 text-xs text-gray-400">
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
  searchQuery,
  sidebarCollapsed,
  onToggleNode,
  onSelectNode,
  onSearchChange,
  onToggleSidebar,
}) => {
  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">ThinkEx</h2>
        )}
        <button
          onClick={onToggleSidebar}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {!sidebarCollapsed && (
        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="space-y-1">
            {treeStructure.map(node => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                selectedNodeId={selectedNodeId}
                onToggle={onToggleNode}
                onSelect={onSelectNode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
