import React, { useState, useRef, useEffect } from 'react';
import type { BreadcrumbItem } from './types';

interface BreadcrumbBarProps {
  breadcrumbPath: BreadcrumbItem[];
  filteredItemsCount: number;
  viewMode: 'list' | 'graph';
  onSelectNode: (nodeId: string) => void;
  onViewModeChange: (mode: 'list' | 'graph') => void;
}

const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  breadcrumbPath,
  filteredItemsCount,
  viewMode,
  onSelectNode,
  onViewModeChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const MAX_BREADCRUMBS = 4;

  let displayPath = breadcrumbPath;
  let hiddenItems: BreadcrumbItem[] = [];

  if (breadcrumbPath.length > MAX_BREADCRUMBS) {
    const start = breadcrumbPath.slice(0, 1);
    const end = breadcrumbPath.slice(-2);
    hiddenItems = breadcrumbPath.slice(1, -2);
    displayPath = [
      ...start,
      { id: 'ellipsis', name: '...' },
      ...end,
    ];
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
      <nav className="flex items-center space-x-2">
        {displayPath.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.id === 'ellipsis' ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  ...
                </button>
                {dropdownOpen && (
                  <div className="absolute mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <ul className="py-1">
                      {hiddenItems.map(hiddenItem => (
                        <li key={hiddenItem.id}>
                          <button
                            onClick={() => {
                              onSelectNode(hiddenItem.id);
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {hiddenItem.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onSelectNode(item.id)}
                className={`text-sm font-medium ${
                  item.id === breadcrumbPath[breadcrumbPath.length - 1].id
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>
      
      <div className="flex items-center space-x-3">
        <div className="text-sm text-gray-500">
          {filteredItemsCount} items
        </div>
        <div className="inline-flex rounded-md border border-gray-200 bg-white">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-l-md ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            List
          </button>
          <button
            onClick={() => onViewModeChange('graph')}
            className={`px-3 py-1.5 text-xs font-medium rounded-r-md ${
              viewMode === 'graph'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Graph
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbBar;
