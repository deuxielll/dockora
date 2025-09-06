import React, { useState, useEffect } from 'react';
import { Cpu, MemoryStick, HardDrive, Loader } from 'lucide-react';
import { getSystemStats } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const StatCircle = ({ percentage, label }) => {
  const colorClass = percentage > 80 
    ? 'text-red-500' 
    : percentage > 60 
    ? 'text-yellow-500' 
    : 'text-blue-500';

  return (
    <div className="relative w-20 h-20 filter drop-shadow-neo">
      <svg className="w-full h-full" viewBox="0 0 36 36">
        <path
          className="text-gray-700/50"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={`${colorClass} transition-colors duration-500`}
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${percentage}, 100`}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-shadow-neo">
        <span className="text-lg font-bold text-gray-200">{Math.round(percentage)}%</span>
        <span className="text-xs text-gray-200">{label}</span>
      </div>
    </div>
  );
};

const SystemUsageWidget = ({ isInteracting }) => {
  const [stats, setStats] = useState({ cpu_usage: 0, memory_usage_percent: 0, disk_usage_percent: 0 });

  useEffect(() => {
    // Only fetch stats if not interacting
    if (isInteracting) return; 

    const fetchStats = async () => {
      try {
        const res = await getSystemStats();
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [isInteracting]);

  if (isInteracting) {
    return (
      <div className="flex-grow flex items-center justify-center h-full">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex justify-around items-center h-full pt-2 pb-4">
      <StatCircle percentage={stats.cpu_usage} label="CPU" />
      <StatCircle percentage={stats.memory_usage_percent} label="RAM" />
      <StatCircle percentage={stats.disk_usage_percent} label="Disk" />
    </div>
  );
};

export default SystemUsageWidget;