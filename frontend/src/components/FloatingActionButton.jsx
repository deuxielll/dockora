import React from 'react';
import { Plus } from 'lucide-react';

const FloatingActionButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-accent text-white w-16 h-16 rounded-full flex items-center justify-center shadow-neo hover:bg-accent-hover active:shadow-neo-inset transition-all duration-300 z-30"
      aria-label="Create new stack"
    >
      <Plus size={32} />
    </button>
  );
};

export default FloatingActionButton;