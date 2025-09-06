import React, { useState, useCallback, useMemo } from "react";
import { getContainerLogs } from "../services/api";
import FloatingActionButton from "./FloatingActionButton";
import ContainerCardSkeleton from "./skeletons/ContainerCardSkeleton";
import StackCard from "./containers/StackCard";
import toast from 'react-hot-toast';
import useContainerManagement from '../hooks/useContainerManagement'; // New import
import ContainerModals from './containers/ContainerModals'; // New import

const ContainerView = ({ onCreateStack }) => {
  const {
    containers,
    filter,
    setFilter,
    isLoading,
    actionLoadingStates,
    fetchContainers,
    handleAction,
  } = useContainerManagement(); // Use the new hook

  const [logs, setLogs] = useState("");
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerToRename, setContainerToRename] = useState(null);
  const [containerToEdit, setContainerToEdit] = useState(null);

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

      <ContainerModals
        selectedContainer={selectedContainer}
        logs={logs}
        containerToRename={containerToRename}
        containerToEdit={containerToEdit}
        setSelectedContainer={setSelectedContainer}
        setContainerToRename={setContainerToRename}
        setContainerToEdit={setContainerToEdit}
        fetchContainers={fetchContainers}
      />
    </div>
  );
};

export default ContainerView;