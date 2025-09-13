import React, { useState, useEffect } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Match transition duration
  };

  const handleConfirm = () => {
    setShow(false);
    setTimeout(onConfirm, 300); // Match transition duration
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${show ? 'opacity-100 backdrop-blur-sm' : 'opacity-0'}`}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div
        className={`relative bg-zinc-950 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-zinc-800 z-10 transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-red-400 mb-4">{title}</h2>
        <p className="text-zinc-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button 
            onClick={handleClose} 
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
