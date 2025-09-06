import React from 'react';
import { Trash2, FileText, Cpu, MemoryStick, Network, Pencil, Edit, Loader } from "lucide-react";
import ActionDropdown from "../ActionDropdown";

const ResourceBar = ({ percentage, label }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-gray-200">{percentage.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-dark-bg rounded-full h-2 shadow-neo-inset">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  </div>
);

const getStatusStyles = (status) => {
  if (status.includes('running') || status.includes('up')) {
    return "text-green-300 bg-green-900/50";
  }
  if (status.includes('paused')) {
    return "text-blue-300 bg-blue-900/50";
  }
  if (status.includes('exited') || status.includes('stopped')) {
    return "text-gray-300 bg-gray-700";
  }
  return "text-yellow-300 bg-yellow-900/50";
};

const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const MiniContainerCard = ({ container, onAction, onViewLogs, onRenameContainer, onEditContainerResources, isActionLoading }) => {
  const isDashboardContainer = container.name.startsWith('dockora'); // Still hide these from direct action
  const isAnyActionLoading = isActionLoading;

  return (
    <div className="p-4 rounded-lg bg-dark-bg-secondary shadow-neo-inset flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-grow w-full sm:w-auto">
        <p className="font-bold text-lg text-gray-200">{container.name}</p>
        <p className="text-sm text-gray-400">{container.image}</p>
        <p className={`text-xs font-medium uppercase tracking-wider mt-2 px-2 py-1 inline-block rounded-full ${getStatusStyles(container.status)}`}>
          {container.status}
        </p>

        {container.status.includes('running') && container.stats && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResourceBar percentage={container.stats.cpu_percent} label="CPU Usage" />
            <ResourceBar percentage={container.stats.memory_percent} label="Memory Usage" />
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2" title="CPU Limit">
            <Cpu size={16} className="text-gray-400" />
            <span>{container.cpus !== 'N/A' ? `${container.cpus} Cores` : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2" title="Memory Limit">
            <MemoryStick size={16} className="text-gray-400" />
            <span>{container.memory_limit}</span>
          </div>
          {container.ports && container.ports.length > 0 && (
            <div className="flex items-start gap-2 min-w-0" title="Port Mappings">
              <Network size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="break-all">{container.ports.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 flex-wrap self-start sm:self-center">
        <ActionDropdown containerId={container.id} onAction={onAction} disabled={isDashboardContainer || isAnyActionLoading} />
        <button title="Edit Resources" onClick={() => onEditContainerResources(container)} disabled={isDashboardContainer || isAnyActionLoading} className={`${iconButtonStyles} text-gray-300`}>
          {isAnyActionLoading ? <Loader size={18} className="animate-spin" /> : <Edit size={18} />}
        </button>
        <button title="Rename" onClick={() => onRenameContainer(container)} disabled={isDashboardContainer || isAnyActionLoading} className={`${iconButtonStyles} text-gray-300`}>
          {isAnyActionLoading ? <Loader size={18} className="animate-spin" /> : <Pencil size={18} />}
        </button>
        <button title="Remove" onClick={() => onAction(container.id, "remove")} disabled={isDashboardContainer || isAnyActionLoading} className={`${iconButtonStyles} text-red-500`}>
          {isAnyActionLoading ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>
        <button title="View Logs" onClick={() => onViewLogs(container)} disabled={isDashboardContainer || isAnyActionLoading} className={`${iconButtonStyles} text-indigo-500`}>
          {isAnyActionLoading ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
        </button>
      </div>
    </div>
  );
};

export default MiniContainerCard;