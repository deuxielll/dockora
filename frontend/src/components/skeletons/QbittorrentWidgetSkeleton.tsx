import React from 'react';
import { Download } from 'lucide-react';

const QbittorrentWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
            <div className="flex items-center justify-between mb-2">
              <div className={`${skeletonBase} h-4 w-3/4`}></div>
              <div className={`${skeletonBase} h-4 w-1/6`}></div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${skeletonBase} h-2 w-full`}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <div className={`${skeletonBase} h-3 w-1/4`}></div>
              <div className={`${skeletonBase} h-3 w-1/4`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QbittorrentWidgetSkeleton;