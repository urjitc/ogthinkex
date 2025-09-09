import React from 'react';
import type { APINode } from './types';

interface RightDrawerProps {
  isOpen: boolean;
  selectedCard: APINode | null;
  topic: string;
  allItems: APINode[];
  onClose: () => void;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  selectedCard,
  topic,
  allItems,
  onClose,
}) => {
  if (!isOpen || !selectedCard) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detail</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Question */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Question</h4>
                <p className="text-gray-900">{selectedCard.question_text}</p>
              </div>

              {/* Answer */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Answer</h4>
                <p className="text-gray-700 leading-relaxed">{selectedCard.answer_text}</p>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Metadata</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Topic:</span>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {topic || 'General'}
                    </span>
                  </div>
                  {selectedCard.parent_node_ids && selectedCard.parent_node_ids.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Related:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCard.parent_node_ids.map(parentId => {
                          const parent = allItems.find(item => item._id === parentId);
                          return parent ? (
                            <span
                              key={parentId}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            >
                              {parent.question_text.slice(0, 20)}...
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                Ask Follow-up
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                Summarize
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                Export to Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightDrawer;
