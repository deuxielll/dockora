import React from 'react';

const ContainerCardSkeleton = () => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className={`p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${panelClasses}`}>
      <div className="flex-grow w-full sm:w-auto">
        <div className={`${skeletonBase} h-7 w-48 mb-2`}></div>
        <div className={`${skeletonBase} h-4 w-64 mb-3`}></div>
        <div className={`${skeletonBase} h-5 w-20 rounded-full`}></div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className={`${skeletonBase} h-3 w-16`}></div>
              <div className={`${skeletonBase} h-3 w-8`}></div>
            </div>
            <div className={`${skeletonBase} h-2 w-full`}></div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className={`${skeletonBase} h-3 w-20`}></div>
              <div className={`${skeletonBase} h-3 w-8`}></div>
            </div>
            <div className={`${skeletonBase} h-2 w-full`}></div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
                <div className={`${skeletonBase} h-4 w-4`}></div>
                <div className={`${skeletonBase} h-4 w-20`}></div>
            </div>
            <div className="flex items-center gap-2">
                <div className={`${skeletonBase} h-4 w-4`}></div>
                <div className={`${skeletonBase} h-4 w-20`}></div>
            </div>
            <div className="flex items-center gap-2">
                <div className={`${skeletonBase} h-4 w-4`}></div>
                <div className={`${skeletonBase} h-4 w-32`}></div>
            </div>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap self-start sm:self-center">
        <div className={`${skeletonBase} w-10 h-10 rounded-full`}></div>
        <div className={`${skeletonBase} w-10 h-10 rounded-full`}></div>
        <div className={`${skeletonBase} w-10 h-10 rounded-full`}></div>
        <div className={`${skeletonBase} w-10 h-10 rounded-full`}></div>
        <div className={`${skeletonBase} w-10 h-10 rounded-full`}></div>
      </div>
    </div>
  );
};

export default ContainerCardSkeleton;