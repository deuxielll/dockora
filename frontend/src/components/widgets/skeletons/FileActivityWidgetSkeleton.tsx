import React from 'react';

const FileActivityWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className={`${skeletonBase} h-10 w-full mb-3 rounded-lg`}></div>

      <div className="space-y-2">
        <div className={`${skeletonBase} h-4 w-32 mb-2`}></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset w-full">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`${skeletonBase} h-4 w-4`}></div>
              <div className={`${skeletonBase} h-4 w-32`}></div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className={`${skeletonBase} h-3 w-3`}></div>
              <div className={`${skeletonBase} h-3 w-16`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileActivityWidgetSkeleton;