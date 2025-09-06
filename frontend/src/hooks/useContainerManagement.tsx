"use client";

import { useState, useEffect, useCallback } from 'react';
import { getContainers, manageContainer } from '../services/api';
import toast from 'react-hot-toast';

const useContainerManagement = () => {
  const [containers, setContainers] = useState([]);
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
    } finally {
      setIsLoading(false);
    }
  }, [containers]);

  const handleAction = async (id, act) => {
    setActionLoadingStates(prev => ({ ...prev, [id]: true }));
    const toastId = toast.loading(`Sending '${act}' command...`);
    
    const originalContainer = containers.find(c => c.id === id);
    if (!originalContainer) {
      setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
      return;
    }
    const originalStatus = originalContainer.status;

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

        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 1000;

        const poll = setInterval(async () => {
            attempts++;
            try {
                const res = await getContainers();
                const updatedContainer = res.data.find(c => c.id === id);
                if (updatedContainer && updatedContainer.status !== originalStatus) {
                    clearInterval(poll);
                    toast.success(`Status for ${updatedContainer.name} updated.`, { id: toastId });
                    setContainers(res.data);
                    setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    toast.warn(`Could not verify status change for ${originalContainer.name}. Refreshing list.`, { id: toastId });
                    fetchContainers();
                    setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
                }
            } catch (pollErr) {
                // Ignore poll errors
            }
        }, pollInterval);

    } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send '${act}' command.`, { id: toastId });
        fetchContainers();
        setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
    }
  };

  useEffect(() => {
    const initialFetch = async () => {
      await fetchContainers();
    };
    initialFetch();

    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  return {
    containers,
    setContainers,
    filter,
    setFilter,
    isLoading,
    actionLoadingStates,
    fetchContainers,
    handleAction,
  };
};

export default useContainerManagement;