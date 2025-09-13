import React, { useState, useEffect } from 'react';
import type { QAPair } from './KnowledgeGraph';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import TableOfContents from './TableOfContents';

interface QAModalProps {
  isOpen: boolean;
  qaItem: QAPair | null;
  onClose: () => void;
}

const QAModal: React.FC<QAModalProps> = ({ isOpen, qaItem, onClose }) => {
  const [show, setShow] = useState(false);

  // Handle the animation states
  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      // When closing, we want to animate out, then unmount
      const timer = setTimeout(() => setShow(false), 300); // Duration of the transition
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setShow(false);
    // Delay closing to allow for animation
    setTimeout(onClose, 300); // Should match transition duration
  };

  if (!isOpen && !show) return null;
  if (!qaItem) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${show ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'}`}
    >
      {/* Backdrop - transparent with click handler */}
      <div 
        className="absolute inset-0"
        onClick={handleClose}
      />
      
      {/* Modal content */}
      <div className={`relative bg-zinc-950/60 rounded-3xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden border border-zinc-800 z-10 transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex h-[90vh]">
          {/*<TableOfContents />*/}
          {/* Modal body */}
          <div className="flex-1 flex flex-col p-6 max-h-[90vh] relative">
            {/* Close button - positioned absolutely in top right */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-200 hover:bg-zinc-800 rounded-full transition-colors z-20"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Question section */}
            <div className="mb-6 ">
              <h3 className="text-lg font-medium text-blue-400 mb-3">
                Question
              </h3>
              <div className="p-4">
                <div className="text-gray-200">
                  <MarkdownText content={qaItem.question} />
                </div>
              </div>
            </div>

            {/* Answer section */}
            <div className="flex flex-col flex-1 min-h-0">
              <h3 className="text-lg font-medium text-green-400 mb-3">
                Answer
              </h3>
              <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
                <div className="text-gray-200">
                  <MarkdownText content={qaItem.answer} />
                </div>
              </div>
            </div>

            {/* Created date if available */}
            {qaItem.created_at && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-400">
                  Created: {new Date(qaItem.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QAModal;
