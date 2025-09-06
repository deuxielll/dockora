import React from 'react';

const NetworkingWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="h-24 mb-4">
        <div className={`${skeletonBase} h-full w-full`}></div>
      </div>
      <div className="flex justify-between items-center text-sm mb-4">
        <div className="flex items-center gap-2">
          <div className={`${skeletonBase} h-4 w-4`}></div>
          <div className={`${skeletonBase} h-4 w-20`}></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${skeletonBase} h-4 w-4`}></div>
          <div className={`${skeletonBase} h-4 w-20`}></div>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className={`${skeletonBase} h-4 w-4`}></div>
              <div className={`${skeletonBase} h-4 w-16`}></div>
            </div>
            <div className={`${skeletonBase} h-4 w-24`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkingWidgetSkeleton;