import React from 'react';

const SystemUsageWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  const CircleSkeleton = () => (
    <div className="relative w-20 h-20 filter drop-shadow-neo">
      <div className={`${skeletonBase} w-full h-full rounded-full`}></div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`${skeletonBase} h-4 w-10 mb-1`}></div>
        <div className={`${skeletonBase} h-3 w-8`}></div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-around items-center h-full pt-2 pb-4">
      <CircleSkeleton />
      <CircleSkeleton />
      <CircleSkeleton />
    </div>
  );
};

export default SystemUsageWidgetSkeleton;