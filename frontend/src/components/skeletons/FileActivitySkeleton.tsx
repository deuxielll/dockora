import React from 'react';

const FileActivitySkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      {/* Optional: Placeholder for new shared count banner */}
      <div className={`${skeletonBase} h-10 w-full mb-3`}></div>

      <div className="flex-grow flex flex-col overflow-y-auto no-scrollbar pr-2">
        <div className={`${skeletonBase} h-4 w-32 mb-4`}></div> {/* Recent Activity title */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`${skeletonBase} h-4 w-4 flex-shrink-0`}></div>
                <div className={`${skeletonBase} h-4 w-32`}></div>
              </div>
              <div className={`${skeletonBase} h-4 w-20 flex-shrink-0 ml-2`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileActivitySkeleton;