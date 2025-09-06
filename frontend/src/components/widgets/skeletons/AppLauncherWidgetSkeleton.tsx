import React from 'react';

const AppLauncherWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  const AppItemSkeleton = () => (
    <div className="flex flex-col items-center text-center p-2 rounded-lg">
      <div className={`${skeletonBase} w-16 h-16 mb-2 rounded-lg`}></div>
      <div className={`${skeletonBase} h-4 w-full`}></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="relative flex-grow">
          <div className={`${skeletonBase} h-10 w-full`}></div>
        </div>
        <div className={`${skeletonBase} h-8 w-8 ml-2 rounded-full`}></div>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <AppItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLauncherWidgetSkeleton;