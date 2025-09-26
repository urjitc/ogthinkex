import React, { useState, useEffect } from 'react';
import type { QAPair } from './ClusterListWithWebSocket';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';

interface ResearchModalProps {
  isOpen: boolean;
  researchItem: QAPair | null;
  onClose: () => void;
}

const ResearchModal: React.FC<ResearchModalProps> = ({ isOpen, researchItem, onClose }) => {
  const [show, setShow] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

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

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleAnswer = (qaId: string) => {
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(qaId)) {
        newSet.delete(qaId);
      } else {
        newSet.add(qaId);
      }
      return newSet;
    });
  };

  if (!isOpen && !show) return null;
  if (!researchItem) return null;

  const relatedQAs = researchItem.related_qas || [];

  // Mock sources data - in real implementation this would come from the API
  const sources = [
    { title: "Research Paper: AI in Healthcare", url: "https://example.com/paper1", type: "academic" },
    { title: "Industry Report: Healthcare AI Trends", url: "https://example.com/report1", type: "report" },
    { title: "News Article: AI Breakthrough", url: "https://example.com/news1", type: "news" }
  ];

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'report':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'news':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'report':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'news':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

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
      <div className={`relative bg-zinc-950/70 rounded-3xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden border border-zinc-800 z-10 transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex h-[90vh]">
          {/* Table of Contents Sidebar */}
          <div className="w-64 bg-zinc-950/70 p-6 border-r border-zinc-800 custom-scrollbar overflow-y-auto h-full">
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex items-center space-x-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>RESEARCH</span>
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-300 mb-4">Table of Contents</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('overview')}
                  className={`w-full text-left text-sm transition-colors ${
                    activeSection === 'overview' 
                      ? 'text-purple-300 bg-purple-500/10 px-2 py-1 rounded' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Research Overview
                </button>
              </li>
              {relatedQAs.map((qa, index) => (
                <li key={qa._id}>
                  <button
                    onClick={() => scrollToSection(`qa-${index}`)}
                    className={`w-full text-left text-sm transition-colors ${
                      activeSection === `qa-${index}` 
                        ? 'text-purple-300 bg-purple-500/10 px-2 py-1 rounded' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
{qa.question.length > 50 ? qa.question.substring(0, 50) + '...' : qa.question}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => scrollToSection('sources')}
                  className={`w-full text-left text-sm transition-colors ${
                    activeSection === 'sources' 
                      ? 'text-purple-300 bg-purple-500/10 px-2 py-1 rounded' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sources ({sources.length})
                </button>
              </li>
            </ul>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col p-6 max-h-[90vh] relative overflow-y-auto custom-scrollbar">
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

            {/* Research Overview Section */}
            <div id="overview" className="mb-8">
              <h3 className="text-lg font-medium text-purple-400 mb-3">
                Overview
              </h3>
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <div className="text-gray-200">
                  <MarkdownText content={researchItem.question} />
                </div>
                <div className="mt-3 text-gray-400">
                  <MarkdownText content={researchItem.answer} />
                </div>
              </div>
            </div>

            {/* Related Q&As Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-blue-400 mb-4">
                  Analysis
              </h3>
              <div className="space-y-6">
                {relatedQAs.map((qa, index) => {
                  const isExpanded = expandedAnswers.has(qa._id);
                  
                  return (
                    <div key={qa._id} id={`qa-${index}`} className="bg-zinc-800/30 rounded-lg border border-zinc-700">
                      <div 
                        className="p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                        onClick={() => toggleAnswer(qa._id)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-200 mb-3">
                              <MarkdownText content={qa.question} />
                            </h4>
                            
                            {/* Collapsible Answer */}
                            <div className="space-y-3">
                              {isExpanded && (
                                <div className="text-sm text-gray-400 leading-relaxed">
                                  <MarkdownText content={qa.answer} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sources Section */}
            <div id="sources" className="mb-6">
              <h3 className="text-lg font-medium text-green-400 mb-4">
                Sources 
              </h3>
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg border ${getSourceColor(source.type)}`}>
                    {getSourceIcon(source.type)}
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-200">{source.title}</h4>
                      <p className="text-xs text-gray-400">{source.url}</p>
                    </div>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Created date if available */}
            {researchItem.created_at && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-400">
                  Created: {new Date(researchItem.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchModal;
