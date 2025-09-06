import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getContainers, manageContainer, getContainerLogs } from "../services/api";
import LogModal from "./modals/LogModal";
import RenameContainerModal from "./modals/RenameContainerModal";
import FloatingActionButton from "./FloatingActionButton";
import EditContainerResourcesModal from "./modals/EditContainerResourcesModal";
import ContainerCardSkeleton from "./skeletons/ContainerCardSkeleton";
import StackCard from "./containers/StackCard"; // New import
import MiniContainerCard from "./containers/MiniContainerCard"; // New import
import toast from 'react-hot-toast';

const ContainerView = ({ onCreateStack }) => {
  const [containers, setContainers] = useState([]);
  const [logs, setLogs] = useState("");
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerToRename, setContainerToRename] = useState(null);
  const [containerToEdit, setContainerToEdit] = useState(null);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingStates, setActionLoadingStates] = useState({}); // { containerId: boolean }

  const fetchContainers = useCallback(async () => {
    try {
      const res = await getContainers();
      // Only update state if the data has actually changed
      if (JSON.stringify(res.data) !== JSON.stringify(containers)) {
        setContainers(res.data);
      }
    } catch (err) {
      console.error("Error fetching containers:", err);
    }
  }, [containers]); // Include containers in dependency array for comparison

  const handleAction = async (id, act) => {
    setActionLoadingStates(prev => ({ ...prev, [id]: true })); // Set loading for this container
    const toastId = toast.loading(`Sending '${act}' command...`);
    
    const originalContainer = containers.find(c => c.id === id);
    if (!originalContainer) {
      setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
      return;
    }
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
                    setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    toast.warn(`Could not verify status change for ${originalContainer.name}. Refreshing list.`, { id: toastId });
                    fetchContainers(); // Fallback to a final fetch
                    setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
                }
            } catch (pollErr) {
                // Ignore poll errors, the main error is already caught
            }
        }, pollInterval);

    } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send '${act}' command.`, { id: toastId });
        // Revert on failure by fetching the real state
        fetchContainers();
        setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
    }
  };

  const handleViewLogs = async (container) => {
    setActionLoadingStates(prev => ({ ...prev, [container.id]: true }));
    try {
      const res = await getContainerLogs(container.id);
      setLogs(res.data.logs);
      setSelectedContainer(container);
    } catch (err) {
      console.error("Error fetching logs:", err);
      toast.error(err.response?.data?.error || "Failed to fetch logs.");
    } finally {
      setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[container.id]; return newState; });
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

  const filteredAndGroupedContainers = useMemo(() => {
    const grouped = new Map();
    const standalone = [];

    containers.forEach(c => {
      // Hide Dockora containers
      if (c.name.startsWith('dockora-')) return;

      // Apply filter
      let matchesFilter = false;
      if (filter === 'all') matchesFilter = true;
      else if (filter === 'active') matchesFilter = c.status.includes('running') || c.status.includes('up');
      else if (filter === 'paused') matchesFilter = c.status.includes('paused');
      else if (filter === 'inactive') {
        const isActive = c.status.includes('running') || c.status.includes('up');
        const isPaused = c.status.includes('paused');
        matchesFilter = !isActive && !isPaused;
      }

      if (matchesFilter) {
        if (c.stack_name) {
          if (!grouped.has(c.stack_name)) {
            grouped.set(c.stack_name, []);
          }
          grouped.get(c.stack_name).push(c);
        } else {
          standalone.push(c);
        }
      }
    });

    // Sort containers within each group by name
    grouped.forEach(containerList => {
      containerList.sort((a, b) => a.name.localeCompare(b.name));
    });
    standalone.sort((a, b) => a.name.localeCompare(b.name));

    return { grouped, standalone };
  }, [containers, filter]);

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
        ) : (
          <>
            {Array.from(filteredAndGroupedContainers.grouped.entries()).map(([stackName, stackContainers]) => (
              <StackCard
                key={stackName}
                stackName={stackName}
                containers={stackContainers}
                onAction={handleAction}
                onViewLogs={handleViewLogs}
                onRenameContainer={setContainerToRename}
                onEditContainerResources={setContainerToEdit}
                actionLoadingStates={actionLoadingStates}
              />
            ))}

            {filteredAndGroupedContainers.standalone.length > 0 && (
              <StackCard
                stackName="Standalone Containers"
                containers={filteredAndGroupedContainers.standalone}
                onAction={handleAction}
                onViewLogs={handleViewLogs}
                onRenameContainer={setContainerToRename}
                onEditContainerResources={setContainerToEdit}
                actionLoadingStates={actionLoadingStates}
              />
            )}

            {filteredAndGroupedContainers.grouped.size === 0 && filteredAndGroupedContainers.standalone.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  No containers found{filter !== 'all' ? ` with status '${filter}'` : ''}.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <FloatingActionButton onClick={onCreateStack} />

      {containerToEdit && (
        <EditContainerResourcesModal
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