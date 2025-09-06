import React from 'react';

const DownloadClientWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex justify-around items-center flex-grow">
          <div className="text-center">
            <div className={`${skeletonBase} h-5 w-5 mx-auto mb-1`}></div>
            <div className={`${skeletonBase} h-6 w-20 mb-1`}></div>
            <div className={`${skeletonBase} h-3 w-16`}></div>
          </div>
          <div className="text-center">
            <div className={`${skeletonBase} h-5 w-5 mx-auto mb-1`}></div>
            <div className={`${skeletonBase} h-6 w-20 mb-1`}></div>
            <div className={`${skeletonBase} h-3 w-16`}></div>
          </div>
        </div>
        <div className={`${skeletonBase} h-4 w-24 flex-shrink-0`}></div>
      </div>
      <div className="flex-grow overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
            <div className="flex items-center gap-3 mb-2">
              <div className={`${skeletonBase} h-4 w-4`}></div>
              <div className={`${skeletonBase} h-4 w-48`}></div>
            </div>
            <div className={`${skeletonBase} w-full h-2 mb-3`}></div>
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-xs">
              <div className={`${skeletonBase} h-3 w-24`}></div>
              <div className={`${skeletonBase} h-3 w-16`}></div>
              <div className={`${skeletonBase} h-3 w-20`}></div>
              <div className={`${skeletonBase} h-3 w-20`}></div>
              <div className={`${skeletonBase} h-3 w-16`}></div>
              <div className={`${skeletonBase} h-3 w-12`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadClientWidgetSkeleton;