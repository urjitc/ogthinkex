import React, { useState, useEffect, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QAPair } from './ClusterListWithWebSocket';

interface SourceNoteCardProps {
  clusterTitle: string;
  item: QAPair;
  onOpenModal: () => void;
  onDelete: () => void;
  animationState?: 'new' | 'updated';
  isOverlay?: boolean;
}

const SourceNoteCard = forwardRef<HTMLDivElement, SourceNoteCardProps>(({ item, clusterTitle, onOpenModal, onDelete, animationState, isOverlay, ...props }, ref) => {
  console.groupCollapsed(`[DEBUG] Rendering SourceNoteCard ${item._id}`);
  console.log('Full Source Note item:', item);
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

  const sourceMetadata = item.source_metadata;
  const sourceContent = item.source_content;

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'book':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'article':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'website':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
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

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'book':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'article':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'pdf':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'video':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'website':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
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
      className={`bg-gradient-to-br from-emerald-950/30 to-teal-950/30 rounded-lg border border-emerald-500/30 shadow-sm hover:shadow-lg hover:border-emerald-400/50 transition-all duration-200 group ${animationClass} ${
        isDragging && !isOverlay ? 'invisible transition-none' : ''
      }`}
      {...props}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>SOURCE</span>
            </div>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(); 
            }}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors duration-200"
            aria-label="Delete Source Note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Source Title */}
        <div className="flex-grow pr-4 cursor-pointer" onClick={onOpenModal}>
          <div className="text-sm font-medium leading-relaxed mb-3 whitespace-pre-wrap text-gray-200">
            {sourceMetadata?.title || item.question}
          </div>
          
          {/* Source Type and Author */}
          {sourceMetadata && (
            <div className="flex items-center space-x-3 text-xs text-gray-400 mb-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-md border ${getSourceColor(sourceMetadata.source_type)}`}>
                {getSourceIcon(sourceMetadata.source_type)}
                <span className="capitalize">{sourceMetadata.source_type}</span>
              </div>
              {sourceMetadata.author && (
                <span>by {sourceMetadata.author}</span>
              )}
            </div>
          )}
        </div>

        {/* Summary Preview */}
        {sourceContent?.summary && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Summary
            </div>
            <div className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              {sourceContent.summary.length > 120 
                ? sourceContent.summary.substring(0, 120) + '...' 
                : sourceContent.summary
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

export default SourceNoteCard;
