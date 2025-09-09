import React from 'react';
import QACard from './QACard';
import type { APINode } from './types';

interface MainPanelProps {
  viewMode: 'list' | 'graph';
  filteredItems: APINode[];
  searchQuery: string;
  onOpenCardDetail: (cardId: string) => void;
  onAddItemToContext: (item: APINode) => void;
}

const MainPanel: React.FC<MainPanelProps> = ({
  viewMode,
  filteredItems,
  searchQuery,
  onOpenCardDetail,
  onAddItemToContext,
}) => {
  return (
    <div className="flex-1 overflow-auto p-6">
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {searchQuery ? 'No items match your search.' : 'No items in this section.'}
            </div>
          ) : (
            filteredItems.map(item => (
              <QACard
                key={item._id}
                item={item}
                onOpenDetail={() => onOpenCardDetail(item._id)}
                onAddItemToContext={() => onAddItemToContext(item)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">Graph View</div>
            <div className="text-sm">Interactive mind map coming soon...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPanel;
