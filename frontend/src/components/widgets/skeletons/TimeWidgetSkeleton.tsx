import React from 'react';

const TimeWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className={`${skeletonBase} h-12 w-48 mb-4`}></div>
      <div className={`${skeletonBase} h-4 w-32 mb-6`}></div>
      <div className="flex gap-4">
        <div className={`${skeletonBase} h-10 w-10 rounded-full`}></div>
        <div className={`${skeletonBase} h-10 w-10 rounded-full`}></div>
        <div className={`${skeletonBase} h-10 w-10 rounded-full`}></div>
        <div className={`${skeletonBase} h-10 w-10 rounded-full`}></div>
      </div>
    </div>
  );
};

export default TimeWidgetSkeleton;