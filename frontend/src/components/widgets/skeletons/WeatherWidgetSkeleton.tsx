import React from 'react';

const WeatherWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col items-center justify-center text-center overflow-y-auto no-scrollbar pr-2">
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className={`${skeletonBase} h-12 w-12 rounded-full`}></div>
        <div>
          <div className={`${skeletonBase} h-8 w-24 mb-2`}></div>
          <div className={`${skeletonBase} h-4 w-32`}></div>
        </div>
      </div>
      <div className={`${skeletonBase} h-4 w-40 mb-4`}></div>

      <div className="grid grid-cols-4 gap-2 text-xs mb-4 w-full max-w-xs">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center">
            <div className={`${skeletonBase} h-4 w-4 mb-1`}></div>
            <div className={`${skeletonBase} h-3 w-10 mb-1`}></div>
            <div className={`${skeletonBase} h-3 w-12`}></div>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm w-full max-w-xs">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center">
            <div className={`${skeletonBase} h-4 w-12`}></div>
            <div className="flex items-center gap-2">
              <div className={`${skeletonBase} h-6 w-6 rounded-full`}></div>
              <div className={`${skeletonBase} h-4 w-16`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidgetSkeleton;