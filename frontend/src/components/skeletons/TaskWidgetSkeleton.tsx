import React from 'react';

const TaskWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <div className={`${skeletonBase} h-10 w-full`}></div>
        <div className={`${skeletonBase} h-10 w-10 rounded-lg`}></div>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
            <div className="flex items-center gap-3">
              <div className={`${skeletonBase} w-5 h-5 rounded`}></div>
              <div className={`${skeletonBase} h-4 w-3/4`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskWidgetSkeleton;