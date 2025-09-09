import React, { useState } from 'react';
import type { APINode } from './types';

interface QACardProps {
  item: APINode;
  onOpenDetail: () => void;
  onAddItemToContext: () => void;
}

const QACard: React.FC<QACardProps> = ({ item, onOpenDetail, onAddItemToContext }) => {
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900 flex-grow pr-4">
            {item.question_text}
          </h3>
          <button
            onClick={() => setIsAnswerVisible(!isAnswerVisible)}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isAnswerVisible ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {isAnswerVisible && (
        <div className="p-4">
          <div className="text-gray-700 leading-relaxed">
            {item.answer_text}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {item.parent_node_ids && item.parent_node_ids.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                Related
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onAddItemToContext}
              className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md"
            >
              Add to Context
            </button>
            <button
              onClick={onOpenDetail}
              className="px-3 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Detail
            </button>
            <button className="px-3 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Follow-up
            </button>
            <button className="px-3 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QACard;
