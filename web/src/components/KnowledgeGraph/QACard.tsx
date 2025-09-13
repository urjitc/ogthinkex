import React, { useState, useEffect } from 'react';
import type { QAPair } from './KnowledgeGraphWithWebSocket';

interface QACardProps {
  item: QAPair;
  onOpenDetail: () => void;
  onOpenModal: () => void;
  animationState?: 'new' | 'updated';
}

const QACard: React.FC<QACardProps> = ({ item, onOpenDetail, onOpenModal, animationState }) => {
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
      className={`bg-zinc-950/50 rounded-lg border border-zinc-800 shadow-sm hover:shadow-lg hover:border-zinc-700 transition-all duration-200 cursor-pointer group ${animationClass}`}
      onClick={onOpenModal}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-4">
            <div className="text-sm font-medium leading-relaxed mb-2 whitespace-pre-wrap text-gray-200">
              {item.question}
            </div>
          </div>
          <div className="flex-shrink-0 p-1.5 text-gray-400 group-hover:text-gray-200 transition-colors">
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
  );
};

export default QACard;
