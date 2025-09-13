import React, { useState, useEffect } from 'react';
import type { QAPair } from './ClusterListWithWebSocket';

interface QACardProps {
  item: QAPair;
  onOpenModal: () => void;
  onDelete: () => void;
  animationState?: 'new' | 'updated';
}

const QACard: React.FC<QACardProps> = ({ item, onOpenModal, onDelete, animationState }) => {
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
      }, 1500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [animationState]);
  return (
        <div 
      id={`qa-card-${item._id}`}
      className={`bg-zinc-950/50 rounded-lg border border-zinc-800 shadow-sm hover:shadow-lg hover:border-zinc-700 transition-all duration-200 group ${animationClass}`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-4 cursor-pointer" onClick={onOpenModal}>
            <div className="text-sm font-medium leading-relaxed mb-2 whitespace-pre-wrap text-gray-200">
              {item.question}
            </div>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(); 
            }}
            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/50 rounded-full transition-colors duration-200"
            aria-label="Delete QA"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QACard;
