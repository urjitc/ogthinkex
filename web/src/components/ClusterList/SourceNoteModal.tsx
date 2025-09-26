import React, { useState, useEffect } from 'react';
import type { QAPair } from './ClusterListWithWebSocket';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';

interface SourceNoteModalProps {
  isOpen: boolean;
  sourceNoteItem: QAPair | null;
  onClose: () => void;
}

const SourceNoteModal: React.FC<SourceNoteModalProps> = ({ isOpen, sourceNoteItem, onClose }) => {
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

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'book':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'article':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'website':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'book':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'article':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'pdf':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'video':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'website':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (!isOpen && !show) return null;
  if (!sourceNoteItem) return null;

  const sourceMetadata = sourceNoteItem.source_metadata;
  const sourceContent = sourceNoteItem.source_content;

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

            {/* Source Title */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-emerald-400 mb-3">
                Source
              </h3>
              <div className="p-4">
                <div className="text-gray-200 text-lg font-medium mb-4">
                  {sourceMetadata?.title || sourceNoteItem.question}
                </div>
                
                {/* Source Type and Author */}
                {sourceMetadata && (
                  <div className="flex items-center space-x-3 text-sm text-gray-400 mb-4">
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-md border ${getSourceColor(sourceMetadata.source_type)}`}>
                      {getSourceIcon(sourceMetadata.source_type)}
                      <span className="capitalize">{sourceMetadata.source_type}</span>
                    </div>
                    {sourceMetadata.author && (
                      <span>by {sourceMetadata.author}</span>
                    )}
                    {sourceMetadata.publication_date && (
                      <span>• {new Date(sourceMetadata.publication_date).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Source URL if available */}
                {sourceMetadata?.url && (
                  <div className="mb-4">
                    <a 
                      href={sourceMetadata.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      {sourceMetadata.url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Section */}
            {sourceContent?.summary && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-blue-400 mb-3">
                  Summary
                </h3>
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="text-gray-200">
                    <MarkdownText content={sourceContent.summary} />
                  </div>
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {sourceContent?.key_takeaways && sourceContent.key_takeaways.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-yellow-400 mb-3">
                  Key Takeaways
                </h3>
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <ul className="space-y-2">
                    {sourceContent.key_takeaways.map((takeaway: string, index: number) => (
                      <li key={index} className="text-gray-200 flex items-start">
                        <span className="text-yellow-400 mr-2">•</span>
                        <MarkdownText content={takeaway} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Personal Notes */}
            {sourceContent?.personal_notes && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-purple-400 mb-3">
                  Personal Notes
                </h3>
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <div className="text-gray-200">
                    <MarkdownText content={sourceContent.personal_notes} />
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {sourceContent?.tags && sourceContent.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-400 mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sourceContent.tags.map((tag: string, index: number) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created date if available */}
            {sourceNoteItem.created_at && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-400">
                  Created: {new Date(sourceNoteItem.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceNoteModal;
