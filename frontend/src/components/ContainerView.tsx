import React, { useEffect, useState, useCallback } from "react";
import { getContainers, manageContainer, getContainerLogs } from "../services/api";
import { Trash2, FileText, Cpu, MemoryStick, Network, Pencil, Edit } from "lucide-react";
import LogModal from "./modals/LogModal";
import ActionDropdown from "./ActionDropdown";
import RenameContainerModal from "./modals/RenameContainerModal";
import FloatingActionButton from "./FloatingActionButton";
import EditContainerModal from "./modals/EditContainerModal";
import ContainerCardSkeleton from "./skeletons/ContainerCardSkeleton";
import toast from 'react-hot-toast';

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

const ContainerView = ({ onCreateStack }) => {
  const [containers, setContainers] = useState([]);
  const [logs, setLogs] = useState("");
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerToRename, setContainerToRename] = useState(null);
  const [containerToEdit, setContainerToEdit] = useState(null);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const panelClasses = "bg-dark-bg shadow-neo";

  const fetchContainers = useCallback(async () => {
    try {
      const res = await getContainers();
      setContainers(res.data);
    } catch (err) {
      console.error("Error fetching containers:", err);
    }
  }, []);

  const handleAction = async (id, act) => {
    const toastId = toast.loading(`Sending '${act}' command...`);
    
    const originalContainer = containers.find(c => c.id === id);
    if (!originalContainer) return;
    const originalStatus = originalContainer.status;

    // Optimistic update
    const getOptimisticStatus = (action) => {
      if (action === 'start' || action === 'unpause' || action === 'restart') return 'running (optimistic)';
      if (action === 'stop') return 'exited (optimistic)';
      if (action === 'pause') return 'paused (optimistic)';
      return 'updating...';
    };
    setContainers(prev => prev.map(c => c.id === id ? { ...c, status: getOptimisticStatus(act) } : c));

    try {
        await manageContainer(id, act);
        toast.success(`'${act}' command sent. Verifying status...`, { id: toastId });

        // Poll for status change
        let attempts = 0;
        const maxAttempts = 10; // 10 attempts over 10 seconds
        const pollInterval = 1000; // 1 second

        const poll = setInterval(async () => {
            attempts++;
            try {
                const res = await getContainers();
                const updatedContainer = res.data.find(c => c.id === id);
                if (updatedContainer && updatedContainer.status !== originalStatus) {
                    clearInterval(poll);
                    toast.success(`Status for ${updatedContainer.name} updated.`, { id: toastId });
                    setContainers(res.data); // Update with the fresh full list
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    toast.warn(`Could not verify status change for ${originalContainer.name}. Refreshing list.`, { id: toastId });
                    fetchContainers(); // Fallback to a final fetch
                }
            } catch (pollErr) {
                // Ignore poll errors, the main error is already caught
            }
        }, pollInterval);

    } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send '${act}' command.`, { id: toastId });
        // Revert on failure by fetching the real state
        fetchContainers();
    }
  };

  const handleViewLogs = async (container) => {
    try {
      const res = await getContainerLogs(container.id);
      setLogs(res.data.logs);
      setSelectedContainer(container);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  useEffect(() => {
    const initialFetch = async () => {
      await fetchContainers();
      setIsLoading(false);
    };
    initialFetch();

    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  const filteredContainers = containers.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status.includes('running') || c.status.includes('up');
    if (filter === 'paused') return c.status.includes('paused');
    if (filter === 'inactive') {
      const isActive = c.status.includes('running') || c.status.includes('up');
      const isPaused = c.status.includes('paused');
      return !isActive && !isPaused;
    }
    return true;
  });

  const FilterButton = ({ value, label }) => {
    const isActive = filter === value;
    return (
      <button
        onClick={() => setFilter(value)}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${
          isActive
            ? "text-accent shadow-neo-inset"
            : "text-gray-200 bg-dark-bg shadow-neo hover:shadow-neo-inset"
        }`}
      >
        {label}
      </button>
    );
  };

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

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterButton value="all" label="All" />
        <FilterButton value="active" label="Active" />
        <FilterButton value="inactive" label="Inactive" />
        <FilterButton value="paused" label="Paused" />
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <>
            <ContainerCardSkeleton />
            <ContainerCardSkeleton />
            <ContainerCardSkeleton />
          </>
        ) : filteredContainers.length > 0 ? filteredContainers.map((c) => {
          const isDashboardContainer = c.name.startsWith('dockora');
          return (
            <div key={c.id} className={`p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${panelClasses}`}>
              <div className="flex-grow w-full sm:w-auto">
                <p className="font-bold text-xl text-gray-200">{c.name}</p>
                <p className="text-sm text-gray-400">{c.image}</p>
                <p className={`text-xs font-medium uppercase tracking-wider mt-2 px-2 py-1 inline-block rounded-full ${getStatusStyles(c.status)}`}>
                  {c.status}
                </p>

                {c.status.includes('running') && c.stats && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ResourceBar percentage={c.stats.cpu_percent} label="CPU Usage" />
                    <ResourceBar percentage={c.stats.memory_percent} label="Memory Usage" />
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2" title="CPU Limit">
                    <Cpu size={16} className="text-gray-400" />
                    <span>{c.cpus !== 'N/A' ? `${c.cpus} Cores` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2" title="Memory Limit">
                    <MemoryStick size={16} className="text-gray-400" />
                    <span>{c.memory_limit}</span>
                  </div>
                  {c.ports && c.ports.length > 0 && (
                    <div className="flex items-start gap-2 min-w-0" title="Port Mappings">
                      <Network size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{c.ports.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap self-start sm:self-center">
                <ActionDropdown containerId={c.id} onAction={handleAction} disabled={isDashboardContainer} />
                <button title="Edit Ports" onClick={() => setContainerToEdit(c)} disabled={isDashboardContainer} className={`${iconButtonStyles} text-gray-300`}><Edit size={18} /></button>
                <button title="Rename" onClick={() => setContainerToRename(c)} disabled={isDashboardContainer} className={`${iconButtonStyles} text-gray-300`}><Pencil size={18} /></button>
                <button title="Remove" onClick={() => handleAction(c.id, "remove")} disabled={isDashboardContainer} className={`${iconButtonStyles} text-red-500`}><Trash2 size={18} /></button>
                <button title="View Logs" onClick={() => handleViewLogs(c)} className={`${iconButtonStyles} text-indigo-500`}><FileText size={18} /></button>
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No containers found{filter !== 'all' ? ` with status '${filter}'` : ''}.
            </p>
          </div>
        )}
      </div>

      <FloatingActionButton onClick={onCreateStack} />

      {containerToEdit && (
        <EditContainerModal
          container={containerToEdit}
          onClose={() => setContainerToEdit(null)}
          onSuccess={() => {
            fetchContainers();
            setContainerToEdit(null);
          }}
        />
      )}
      {containerToRename && (
        <RenameContainerModal 
          container={containerToRename}
          onClose={() => setContainerToRename(null)}
          onSuccess={fetchContainers}
        />
      )}
      {selectedContainer && (
        <LogModal 
          container={selectedContainer} 
          logs={logs} 
          onClose={() => setSelectedContainer(null)} 
        />
      )}
    </div>
  );
};

export default ContainerView;