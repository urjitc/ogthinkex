import React from 'react';

interface ContextToolbarProps {
  onToggleDrawer: () => void;
  onDelete: () => void;
  contextItemCount: number;
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({ onToggleDrawer, onDelete, contextItemCount }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={onToggleDrawer}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
        <span>Context</span>
        {contextItemCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
            {contextItemCount}
          </span>
        )}
      </button>
      {contextItemCount > 0 && (
        <button
          onClick={onDelete}
          className="ml-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-full shadow-lg flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ContextToolbar;
