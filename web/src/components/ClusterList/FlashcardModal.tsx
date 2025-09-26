import React, { useState, useEffect } from 'react';
import type { QAPair } from './ClusterListWithWebSocket';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';

interface FlashcardModalProps {
  isOpen: boolean;
  flashcardItem: QAPair | null;
  onClose: () => void;
}

const FlashcardModal: React.FC<FlashcardModalProps> = ({ isOpen, flashcardItem, onClose }) => {
  const [show, setShow] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'browse' | 'study'>('browse');

  // Handle the animation states
  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } else {
      // When closing, we want to animate out, then unmount
      const timer = setTimeout(() => setShow(false), 300);
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
    setTimeout(onClose, 300);
  };

  const nextCard = () => {
    if (flashcardItem?.flashcard_set?.cards) {
      setCurrentCardIndex((prev) => 
        prev < flashcardItem.flashcard_set!.cards.length - 1 ? prev + 1 : 0
      );
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (flashcardItem?.flashcard_set?.cards) {
      setCurrentCardIndex((prev) => 
        prev > 0 ? prev - 1 : flashcardItem.flashcard_set!.cards.length - 1
      );
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'hard':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (!isOpen && !show) return null;
  if (!flashcardItem || !flashcardItem.flashcard_set) return null;

  const flashcardSet = flashcardItem.flashcard_set;
  const currentCard = flashcardSet.cards[currentCardIndex];
  const totalCards = flashcardSet.cards.length;

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
      <div className={`relative bg-zinc-950/60 rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-zinc-800 z-10 transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex h-[90vh]">
          {/* Sidebar */}
          <div className="w-64 bg-zinc-950/70 p-6 border-r border-zinc-800 custom-scrollbar overflow-y-auto h-full">
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex items-center space-x-1 bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>FLASHCARDS</span>
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-300 mb-4">{flashcardSet.title}</h3>
            <p className="text-sm text-gray-400 mb-6">{flashcardSet.description}</p>
            
            {/* Study Mode Toggle */}
            <div className="mb-6">
              <div className="flex bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setStudyMode('browse')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    studyMode === 'browse' 
                      ? 'bg-cyan-500 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => setStudyMode('study')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    studyMode === 'study' 
                      ? 'bg-cyan-500 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Study
                </button>
              </div>
            </div>

            {/* Card List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Cards ({totalCards})</h4>
              {flashcardSet.cards.map((card, index) => (
                <button
                  key={card.id}
                  onClick={() => {
                    setCurrentCardIndex(index);
                    setIsFlipped(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    index === currentCardIndex
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-gray-400 hover:text-white hover:bg-zinc-700/50'
                  }`}
                >
                  <div className="text-sm font-medium mb-1 line-clamp-2">{card.front}</div>
                  {card.difficulty && (
                    <div className={`inline-block px-2 py-1 rounded text-xs ${getDifficultyColor(card.difficulty)}`}>
                      {card.difficulty}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col p-6 max-h-[90vh] relative overflow-y-auto custom-scrollbar">
            {/* Close button */}
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

            {/* Flashcard */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-2xl">
                {/* Card Counter */}
                <div className="text-center mb-6">
                  <span className="text-sm text-gray-400">
                    Card {currentCardIndex + 1} of {totalCards}
                  </span>
                </div>

                {/* Flashcard */}
                <div 
                  className={`relative w-full h-80 cursor-pointer transition-transform duration-500 transform-style-preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  onClick={flipCard}
                >
                  {/* Front of card */}
                  <div className={`absolute inset-0 w-full h-full backface-hidden ${
                    isFlipped ? 'opacity-0' : 'opacity-100'
                  }`}>
                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/30 p-8 h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm font-medium text-cyan-300 mb-4 uppercase tracking-wide">
                          Question
                        </div>
                        <div className="text-lg text-gray-200 leading-relaxed">
                          <MarkdownText content={currentCard.front} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back of card */}
                  <div className={`absolute inset-0 w-full h-full backface-hidden transform rotate-y-180 ${
                    isFlipped ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border border-blue-500/30 p-8 h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm font-medium text-blue-300 mb-4 uppercase tracking-wide">
                          Answer
                        </div>
                        <div className="text-lg text-gray-200 leading-relaxed">
                          <MarkdownText content={currentCard.back} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={prevCard}
                    className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm text-gray-200">Previous</span>
                  </button>

                  <button
                    onClick={flipCard}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {isFlipped ? 'Show Question' : 'Show Answer'}
                  </button>

                  <button
                    onClick={nextCard}
                    className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <span className="text-sm text-gray-200">Next</span>
                    <svg className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Study Mode Instructions */}
                {studyMode === 'study' && (
                  <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <div className="text-sm text-cyan-300 font-medium mb-2">Study Mode</div>
                    <div className="text-sm text-gray-400">
                      Click the card to flip it. Use Previous/Next to navigate through all cards. 
                      Try to answer each question before revealing the answer.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardModal;
