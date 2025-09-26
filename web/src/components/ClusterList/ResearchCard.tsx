import React, { useState, useEffect, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QAPair } from './ClusterListWithWebSocket';

interface ResearchCardProps {
  clusterTitle: string;
  item: QAPair;
  onOpenModal: () => void;
  onDelete: () => void;
  animationState?: 'new' | 'updated';
  isOverlay?: boolean;
}

const ResearchCard = forwardRef<HTMLDivElement, ResearchCardProps>(({ item, clusterTitle, onOpenModal, onDelete, animationState, isOverlay, ...props }, ref) => {
  console.groupCollapsed(`[DEBUG] Rendering ResearchCard ${item._id}`);
  console.log('Full Research item:', item);
  console.log('Cluster:', clusterTitle);
  console.groupEnd();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
    data: {
      clusterTitle: clusterTitle,
      item: item,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (animationState === 'new') {
      setAnimationClass('animate-card-new');
    } else if (animationState === 'updated') {
      setAnimationClass('animate-card-updated');
    }

    if (animationState) {
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [animationState]);

  // Mock sources data - in real implementation this would come from the API
  const sources = [
    { title: "Research Paper: AI in Healthcare", url: "https://example.com/paper1", type: "academic" },
    { title: "Industry Report: Healthcare AI Trends", url: "https://example.com/report1", type: "report" },
    { title: "News Article: AI Breakthrough", url: "https://example.com/news1", type: "news" }
  ];

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'report':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'news':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'report':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'news':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div 
      ref={ref || setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      id={`qa-card-${item._id}`}
      className={`bg-gradient-to-br from-purple-950/30 to-indigo-950/30 rounded-lg border border-purple-500/30 shadow-sm hover:shadow-lg hover:border-purple-400/50 transition-all duration-200 group ${animationClass} ${
        isDragging && !isOverlay ? 'invisible transition-none' : ''
      }`}
      {...props}
    >
      {/* Header with Research Badge */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>RESEARCH</span>
            </div>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(); 
            }}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors duration-200"
            aria-label="Delete Research"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Research Topic Title */}
        <div className="flex-grow pr-4 cursor-pointer" onClick={onOpenModal}>
          <div className="text-sm font-medium leading-relaxed mb-3 whitespace-pre-wrap text-gray-200">
            {item.question}
          </div>
          
          {/* Show related Q&As count */}
          {item.related_qas && item.related_qas.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-purple-300 mb-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{item.related_qas.length} related questions</span>
            </div>
          )}
        </div>

        {/* Sources Section */}
        <div className="space-y-2">
          
          <div className="space-y-1">
            {sources.slice(0, 2).map((source, index) => (
              <div key={index} className={`flex items-center space-x-2 p-2 rounded-md border ${getSourceColor(source.type)}`}>
                {getSourceIcon(source.type)}
                <span className="text-xs truncate flex-1">{source.title}</span>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
            {sources.length > 2 && (
              <div className="text-xs text-gray-500 text-center py-1">
                +{sources.length - 2} more sources
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ResearchCard;
