import React from 'react';

const DeploymentStatusWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end -mt-2 mb-2">
        <div className={`${skeletonBase} h-5 w-24`}></div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 no-scrollbar">
        {[1, 2].map((i) => (
          <div key={i} className="bg-dark-bg shadow-neo p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`${skeletonBase} h-5 w-5 rounded-full`}></div>
                <div>
                  <div className={`${skeletonBase} h-4 w-32 mb-1`}></div>
                  <div className={`${skeletonBase} h-3 w-24`}></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`${skeletonBase} h-8 w-8 rounded-full`}></div>
                <div className={`${skeletonBase} h-8 w-8 rounded-full`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentStatusWidgetSkeleton;