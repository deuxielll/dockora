import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Pause, RefreshCw, MoreVertical } from 'lucide-react';

const ActionDropdown = ({ containerId, onAction, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const actions = [
    { name: 'start', icon: Play, color: 'text-green-500', title: 'Start' },
    { name: 'stop', icon: Square, color: 'text-red-500', title: 'Stop' },
    { name: 'pause', icon: Pause, color: 'text-yellow-500', title: 'Pause' },
    { name: 'restart', icon: RefreshCw, color: 'text-blue-500', title: 'Restart' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleActionClick = (containerId, actionName) => {
    onAction(containerId, actionName);
    setIsOpen(false);
  };

  const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`${iconButtonStyles} text-gray-300`}
      >
        <MoreVertical size={18} />
      </button>
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 flex flex-row items-center gap-2 p-2 bg-dark-bg rounded-lg shadow-neo z-10">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.name}
                title={action.title}
                onClick={() => handleActionClick(containerId, action.name)}
                className={`${iconButtonStyles} ${action.color}`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionDropdown;