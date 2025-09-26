import React, { useState, useEffect, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QAPair } from './ClusterListWithWebSocket';

interface FlashcardCardProps {
  clusterTitle: string;
  item: QAPair;
  onOpenModal: () => void;
  onDelete: () => void;
  animationState?: 'new' | 'updated';
  isOverlay?: boolean;
}

const FlashcardCard = forwardRef<HTMLDivElement, FlashcardCardProps>(({ item, clusterTitle, onOpenModal, onDelete, animationState, isOverlay, ...props }, ref) => {
  console.groupCollapsed(`[DEBUG] Rendering FlashcardCard ${item._id}`);
  console.log('Full Flashcard item:', item);
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

  const flashcardSet = item.flashcard_set;
  const cardCount = flashcardSet?.cards?.length || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'hard':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
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
      className={`bg-gradient-to-br from-cyan-950/30 to-blue-950/30 rounded-lg border border-cyan-500/30 shadow-sm hover:shadow-lg hover:border-cyan-400/50 transition-all duration-200 group ${animationClass} ${
        isDragging && !isOverlay ? 'invisible transition-none' : ''
      }`}
      {...props}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>FLASHCARDS</span>
            </div>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(); 
            }}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors duration-200"
            aria-label="Delete Flashcard Set"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Flashcard Set Title */}
        <div className="flex-grow pr-4 cursor-pointer" onClick={onOpenModal}>
          <div className="text-sm font-medium leading-relaxed mb-3 whitespace-pre-wrap text-gray-200">
            {flashcardSet?.title || item.question}
          </div>
          
          {/* Card Count and Description */}
          <div className="flex items-center space-x-3 text-xs text-gray-400 mb-2">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{cardCount} cards</span>
            </div>
            
          </div>
        </div>

        {/* Description Preview */}
        {flashcardSet?.description && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Description
            </div>
            <div className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              {flashcardSet.description.length > 100 
                ? flashcardSet.description.substring(0, 100) + '...' 
                : flashcardSet.description
              }
            </div>
          </div>
        )}

       
      </div>
    </div>
  );
});

export default FlashcardCard;
