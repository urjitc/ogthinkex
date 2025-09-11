import React, { useState, useRef, useEffect } from 'react';
import type { BreadcrumbItem } from './types';

interface BreadcrumbBarProps {
  breadcrumbPath: BreadcrumbItem[];
  filteredItemsCount: number;
  onSelectNode: (nodeId: string) => void;
  isConnected: boolean;
}

const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  breadcrumbPath,
  filteredItemsCount,
  onSelectNode,
  isConnected,
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
    <div className="flex items-center justify-between h-16 bg-zinc-950/50 border-b border-gray-700 px-6">
      {/* Left side - Breadcrumbs */}
      <nav className="flex items-center space-x-2">
        {displayPath.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.id === 'ellipsis' ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center text-sm font-medium text-gray-400 hover:text-gray-200"
                >
                  ...
                </button>
                {dropdownOpen && (
                  <div className="absolute mt-2 w-56 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-600">
                    <ul className="py-1">
                      {hiddenItems.map(hiddenItem => (
                        <li key={hiddenItem.id}>
                          <button
                            onClick={() => {
                              onSelectNode(hiddenItem.id);
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
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
                className={`flex items-center text-sm font-medium transition-colors ${
                  item.id === breadcrumbPath[breadcrumbPath.length - 1].id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {item.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>
      
      {/* Right side - Controls and Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">
            {filteredItemsCount} items
          </span>
          
          {/* WebSocket Connection Status */}
          <div className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
            isConnected 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-400 animate-pulse-live' : 'bg-red-400'}`}></div>
              <span className="leading-none">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbBar;
