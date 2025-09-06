import React from 'react';

const AppLauncherSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="relative flex-grow">
          <div className={`${skeletonBase} h-12 w-full`}></div>
        </div>
        <div className={`${skeletonBase} h-10 w-10 ml-2 rounded-full`}></div>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex flex-col items-center text-center p-2 rounded-lg">
              <div className={`relative w-16 h-16 mb-2 ${skeletonBase} rounded-lg`}></div>
              <div className={`${skeletonBase} h-4 w-full max-w-[80%] mt-1`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLauncherSkeleton;