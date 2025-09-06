import React from 'react';
import { Folder, FileText } from 'lucide-react';

const FileTableSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";

  return (
    <div className="w-full text-left select-none">
      <thead>
        <tr className="border-b border-gray-700/50">
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">
            <div className={`${skeletonBase} h-4 w-24`}></div>
          </th>
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden lg:table-cell">
            <div className={`${skeletonBase} h-4 w-32`}></div>
          </th>
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden md:table-cell">
            <div className={`${skeletonBase} h-4 w-16`}></div>
          </th>
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden sm:table-cell">
            <div className={`${skeletonBase} h-4 w-28`}></div>
          </th>
        </tr>
      </thead>
      <tbody>
        {[...Array(7)].map((_, i) => (
          <tr key={i} className="transition-colors duration-200">
            <td className="p-4 flex items-center gap-3">
              <div className={`${skeletonBase} h-5 w-5 flex-shrink-0`}></div>
              <div className={`${skeletonBase} h-4 w-48`}></div>
            </td>
            <td className="p-4 text-sm hidden lg:table-cell">
              <div className={`${skeletonBase} h-4 w-64`}></div>
            </td>
            <td className="p-4 text-sm hidden md:table-cell">
              <div className={`${skeletonBase} h-4 w-12`}></div>
            </td>
            <td className="p-4 text-sm hidden sm:table-cell">
              <div className={`${skeletonBase} h-4 w-32`}></div>
            </td>
          </tr>
        ))}
      </tbody>
    </div>
  );
};

export default FileTableSkeleton;