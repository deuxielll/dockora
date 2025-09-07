import React from 'react';

const DownloadClientWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      {/* Input and Add button */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className={`${skeletonBase} h-10 flex-grow`}></div>
        <div className={`${skeletonBase} h-10 w-10`}></div>
      </div>

      {/* Active Downloads Header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <div className={`${skeletonBase} h-5 w-32`}></div>
        <div className={`${skeletonBase} h-8 w-8 rounded-full`}></div>
      </div>

      {/* Active Downloads List */}
      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-3">
        {[...Array(3)].map((_, i) => ( // Show a few active download skeletons
          <div key={i} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
            <div className="flex justify-between items-center mb-2">
              <div className={`${skeletonBase} h-4 w-48`}></div>
              <div className={`${skeletonBase} h-4 w-16`}></div>
            </div>
            <div className={`${skeletonBase} h-2 w-full mb-2`}></div> {/* Progress bar */}
            <div className="flex justify-between text-xs text-gray-400">
              <div className={`${skeletonBase} h-3 w-20`}></div>
              <div className={`${skeletonBase} h-3 w-20`}></div>
              <div className={`${skeletonBase} h-3 w-16`}></div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <div className={`${skeletonBase} h-8 w-8 rounded-full`}></div>
              <div className={`${skeletonBase} h-8 w-8 rounded-full`}></div>
            </div>
          </div>
        ))}

        {/* Completed Downloads Header */}
        <div className="flex items-center gap-2 mt-4 mb-3 flex-shrink-0">
          <div className={`${skeletonBase} h-5 w-40`}></div>
          <div className={`${skeletonBase} h-5 w-5`}></div>
        </div>

        {/* Completed Downloads List (collapsed) */}
        <div className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
          <div className={`${skeletonBase} h-4 w-full`}></div>
        </div>
      </div>
    </div>
  );
};

export default DownloadClientWidgetSkeleton;