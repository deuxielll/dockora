import React from 'react';
import { EyeOff, GripVertical } from 'lucide-react';

const WidgetWrapper = ({ widgetId, title, onHide, children, isLocked }) => {
  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`${panelClasses} rounded-2xl flex flex-col overflow-hidden h-full`}>
      <header className="flex justify-between items-center p-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-200">
          {!isLocked && (
            <div className="drag-handle cursor-move">
              <GripVertical size={20} className="text-gray-200" />
            </div>
          )}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHide(widgetId);
          }}
          className="p-2 rounded-full hover:shadow-neo-inset transition-all text-gray-200"
          title="Hide Widget"
        >
          <EyeOff size={16} className="text-gray-200" />
        </button>
      </header>
      <div className="p-4 pt-2 flex-grow min-h-0">
        {children}
      </div>
    </div>
  );
};

export default WidgetWrapper;