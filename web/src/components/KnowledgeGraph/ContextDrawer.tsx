import React from 'react';

interface ContextItem {
  _id: string;
  question_text: string;
  answer_text: string;
}

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextItems: ContextItem[];
  onRemoveItem: (id: string) => void;
}

const ContextDrawer: React.FC<ContextDrawerProps> = ({ isOpen, onClose, contextItems, onRemoveItem }) => {
  return (
    <div className={`fixed top-0 right-0 h-full w-1/3 bg-white shadow-lg z-50 border-l border-gray-200 transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Context</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="text-gray-900">
          {contextItems.length === 0 ? (
            <p className="text-gray-500">No items in context.</p>
          ) : (
            contextItems.map(item => (
              <div key={item._id} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <h3 className="font-bold mb-2 text-gray-900">{item.question_text}</h3>
                <p className="text-sm text-gray-700">{item.answer_text}</p>
                <button 
                  onClick={() => onRemoveItem(item._id)} 
                  className="text-red-500 hover:text-red-700 text-sm mt-2 font-medium">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 flex justify-end">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ContextDrawer;
