"use client";

import React from 'react';
import { GripVertical, ExternalLink } from 'lucide-react'; // Import ExternalLink

const WidgetWrapper = ({ widgetId, title, onHide, children, isLocked, isInteracting }) => {
  const panelClasses = "bg-dark-bg shadow-neo";

  // Clone children to inject isInteracting prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isInteracting, isLocked });
    }
    return child;
  });

  const handlePopout = () => {
    window.open(`/widget/${widgetId}`, '_blank', 'width=600,height=400,resizable=yes,scrollbars=yes');
  };

  return (
    <div className={`${panelClasses} rounded-2xl flex flex-col overflow-hidden h-full group`}> {/* Add group class here */}
      <header className="flex justify-between items-center p-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-200">
          {/* Conditionally render the drag handle */}
          {!isLocked && (
            <div className={`drag-handle ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}>
              <GripVertical size={20} className="text-gray-200" />
            </div>
          )}
          <h3 className="font-semibold">{title}</h3>
        </div>
        {/* Pop-out button */}
        <button
          onClick={handlePopout}
          className="p-2 rounded-full text-gray-400 hover:text-accent hover:shadow-neo-inset transition-all opacity-0 group-hover:opacity-100"
          title="Open in new window"
        >
          <ExternalLink size={18} />
        </button>
        {/* The hide widget button has been removed */}
      </header>
      <div className="p-4 pt-2 flex-grow min-h-0">
        {childrenWithProps}
      </div>
    </div>
  );
};

export default WidgetWrapper;