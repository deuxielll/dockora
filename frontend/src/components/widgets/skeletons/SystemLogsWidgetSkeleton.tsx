import React from 'react';

const SystemLogsWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <div className={`${skeletonBase} h-10 w-full`}></div>
      </div>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold flex-shrink-0">
        <div className={`${skeletonBase} h-5 w-5`}></div>
        <div className={`${skeletonBase} h-4 w-16`}></div>
        <div className={`${skeletonBase} h-4 w-16 ml-auto`}></div>
      </div>
      <div className={`${skeletonBase} p-4 rounded-lg flex-grow`}>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={`${skeletonBase} h-3 w-full`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemLogsWidgetSkeleton;