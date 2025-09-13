import React, { useState, useEffect } from 'react';
import type { QAPair } from './KnowledgeGraphWithWebSocket';

interface QACardProps {
  item: QAPair;
  onOpenDetail: () => void;
  onOpenModal: () => void;
  animationState?: 'new' | 'updated';
  isSelectedForDeletion?: boolean;
  onToggleSelection?: (qaId: string) => void;
}

const QACard: React.FC<QACardProps> = ({ item, onOpenDetail, onOpenModal, animationState, isSelectedForDeletion = false, onToggleSelection }) => {
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
      className={`relative bg-zinc-950/50 rounded-lg border shadow-sm hover:shadow-lg hover:border-zinc-700 transition-all duration-200 group ${animationClass} ${isSelectedForDeletion ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-800'}`}>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-4 cursor-pointer" onClick={onOpenModal}>
            <div className="text-sm font-medium leading-relaxed mb-2 whitespace-pre-wrap text-gray-200">
              {item.question}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-2">
            {onToggleSelection && (
              <div
                className="h-5 w-5 rounded bg-gray-800/50 border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(item._id);
                }}
              >
                {isSelectedForDeletion && (
                  <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
            <div className="p-1.5 text-gray-400 group-hover:text-gray-200 transition-colors cursor-pointer" onClick={onOpenModal}>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QACard;
