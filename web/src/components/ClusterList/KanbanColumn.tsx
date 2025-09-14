import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Cluster, QAPair } from './ClusterListWithWebSocket';
import QACard from './QACard';

import { useState, useRef, useEffect } from 'react';

interface KanbanColumnProps {
  cluster: Cluster;
  onOpenQAModal: (qaItem: QAPair) => void;
  onDeleteQA: (qaId: string, clusterName: string) => void;
  onDeleteCluster: (clusterName: string) => void;
  isAnimated: boolean;
  columnIndex: number;
  animatedItems: { [key: string]: string };
}

// Global array to track used colors for adjacent column checking
let usedColors: number[] = [];

const getStatusColor = (title: string, columnIndex: number) => {
  const colors = [
    'bg-red-950/40 border-red-900/60',
    'bg-green-950/40 border-green-900/60',
    'bg-blue-950/40 border-blue-900/60',
    'bg-purple-950/40 border-purple-900/60',
    'bg-orange-950/40 border-orange-900/60',
    'bg-slate-950/40 border-slate-900/60',
    'bg-pink-950/40 border-pink-900/60',
    'bg-indigo-950/40 border-indigo-900/60',
    'bg-teal-950/40 border-teal-900/60',
    'bg-cyan-950/40 border-cyan-900/60',
    'bg-amber-950/40 border-amber-900/60',
    'bg-lime-950/40 border-lime-900/60',
    'bg-emerald-950/40 border-emerald-900/60',
    'bg-sky-950/40 border-sky-900/60',
    'bg-violet-950/40 border-violet-900/60',
    'bg-fuchsia-950/40 border-fuchsia-900/60',
    'bg-rose-950/40 border-rose-900/60',
  ];
  
  if (columnIndex === 0) {
    usedColors = [];
  }
  
  let seed = 0;
  for (let i = 0; i < title.length; i++) {
    seed = title.charCodeAt(i) + ((seed << 5) - seed);
  }
  
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  
  let attempts = 0;
  let colorIndex: number;
  
  do {
    const randomSeed = seed + attempts * 1337;
    colorIndex = Math.floor(seededRandom(randomSeed) * colors.length);
    attempts++;
  } while (
    attempts < colors.length && 
    (usedColors.includes(colorIndex) || 
     (columnIndex > 0 && usedColors[columnIndex - 1] === colorIndex))
  );
  
  usedColors[columnIndex] = colorIndex;
  
  return colors[colorIndex];
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ cluster, onOpenQAModal, onDeleteQA, onDeleteCluster, isAnimated, columnIndex, animatedItems }) => {
  const { setNodeRef } = useDroppable({
    id: cluster.title,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const statusColors = useMemo(() => getStatusColor(cluster.title, columnIndex), [cluster.title, columnIndex]);
  
  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(107, 114, 128, 0.5);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}</style>
            <div 
        ref={setNodeRef}
        id={`cluster-${cluster.title}`} 
        className={`w-80 flex-shrink-0 rounded-lg border ${statusColors} flex flex-col max-h-full ${isAnimated ? 'animate-glow' : ''}`}
      >
        {/* Column Header */}
        <div className="flex-shrink-0 p-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-100 text-sm uppercase tracking-wide">
            {cluster.title}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="bg-zinc-950/50  text-gray-400 text-xs px-2 py-1 rounded-full">
              {cluster.qas.length}
            </span>
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                  <ul className="py-1">
                    <li>
                      <button 
                        onClick={() => { 
                          onDeleteCluster(cluster.title); 
                          setDropdownOpen(false); 
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300"
                      >
                        Delete Cluster
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Cards Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
          <SortableContext items={cluster.qas.map(qa => qa._id)} strategy={verticalListSortingStrategy}>
            {cluster.qas.map(qa => (
              <QACard 
                key={qa._id} 
                item={qa} 
                clusterTitle={cluster.title}
                onOpenModal={() => onOpenQAModal(qa)}
                onDelete={() => onDeleteQA(qa._id, cluster.title)}
                animationState={animatedItems[qa._id] as 'new' | 'updated' | undefined}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </>
  );
};

export default KanbanColumn;
