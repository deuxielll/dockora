import React from 'react';
import { GripVertical } from 'lucide-react';

const WidgetWrapper = ({ widgetId, title, onHide, children, isLocked }) => {
  const panelClasses = "bg-dark-bg shadow-neo";

  // Clone children to inject isInteracting prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Removed isInteracting prop from here
      return React.cloneElement(child, {});
    }
    return child;
  });

  return (
    <div className={`${panelClasses} rounded-2xl flex flex-col overflow-hidden h-full`}>
      <header className="flex justify-between items-center p-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-200">
          <div className={`drag-handle ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}>
            <GripVertical size={20} className="text-gray-200" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {/* The hide widget button has been removed */}
      </header>
      <div className="p-4 pt-2 flex-grow min-h-0">
        {childrenWithProps}
      </div>
    </div>
  );
};

export default WidgetWrapper;