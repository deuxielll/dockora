import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Loader, AlertTriangle } from 'lucide-react';
import { getContainers, streamContainerLogs } from '../../services/api';
import { useSettings } from '../../hooks/useSettings';
import LoadingSpinner from '../LoadingSpinner';
import toast from 'react-hot-toast';

const SystemLogsWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";
  return (
    <div className="h-full flex flex-col">
      <div className={`${skeletonBase} h-10 w-full mb-4`}></div>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-400 flex-shrink-0">
        <div className={`${skeletonBase} h-4 w-4`}></div>
        <div className={`${skeletonBase} h-4 w-16`}></div>
        <div className={`${skeletonBase} h-4 w-16 ml-auto`}></div>
      </div>
      <div className="text-xs overflow-y-auto bg-gray-900 p-4 rounded-lg flex-grow whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`${skeletonBase} h-3 w-full mb-2`}></div>
        ))}
      </div>
    </div>
  );
};

const SystemLogsWidget = () => {
  const { settings, setSetting } = useSettings();
  const [availableContainers, setAvailableContainers] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const logContainerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const systemLogsWidgetConfig = settings.systemLogsWidgetConfig ? JSON.parse(settings.systemLogsWidgetConfig) : {};

  const fetchContainers = useCallback(async () => {
    try {
      const res = await getContainers();
      setAvailableContainers(res.data);
      if (!selectedContainerId && res.data.length > 0) {
        const defaultContainerId = systemLogsWidgetConfig.defaultContainerId || res.data[0].id;
        setSelectedContainerId(defaultContainerId);
      }
    } catch (err) {
      setError("Failed to fetch container list.");
      console.error("Error fetching containers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedContainerId, systemLogsWidgetConfig.defaultContainerId]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!selectedContainerId) {
      setLogs('');
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setError(null);
    setLogs(''); // Clear logs for new selection
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const startStreaming = async () => {
      let currentLogs = '';
      try {
        await streamContainerLogs(selectedContainerId, (chunk) => {
          if (signal.aborted) return;
          currentLogs += chunk;
          setLogs(currentLogs);
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        });
      } catch (err) {
        if (signal.aborted) return;
        const errorMessage = err.message || "Failed to stream logs.";
        setError(errorMessage);
        setLogs(prev => prev + `\n[ERROR] ${errorMessage}`);
        toast.error(`Failed to stream logs for ${selectedContainerId}.`);
        console.error("Log streaming error:", err);
      } finally {
        if (!signal.aborted) {
          setIsStreaming(false);
        }
      }
    };

    startStreaming();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedContainerId]);

  const handleContainerChange = async (e) => {
    const newContainerId = e.target.value;
    setSelectedContainerId(newContainerId);
    // Save the new default container ID to settings
    await setSetting('systemLogsWidgetConfig', JSON.stringify({ ...systemLogsWidgetConfig, defaultContainerId: newContainerId }));
  };

  const inputStyles = "w-full p-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";

  const renderContent = () => {
    if (isLoading) {
      return <SystemLogsWidgetSkeleton />;
    }
    if (error && !selectedContainerId) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          <AlertTriangle size={48} className="mb-4" />
          <p className="font-bold text-lg">Error Loading Containers</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      );
    }
    if (availableContainers.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
          <Terminal size={48} className="mb-4" />
          <p className="font-semibold text-gray-200">No Docker Containers Found</p>
          <p className="text-sm">Ensure Docker is running and containers are active.</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <label htmlFor="container-select" className="sr-only">Select Container</label>
          <select
            id="container-select"
            value={selectedContainerId}
            onChange={handleContainerChange}
            className={inputStyles}
          >
            {availableContainers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-400 flex-shrink-0">
          <Terminal size={18} />
          <span>Logs:</span>
          {isStreaming && <Loader size={16} className="animate-spin text-blue-500 ml-auto" />}
          {error && !isStreaming && <AlertTriangle size={16} className="text-red-500 ml-auto" title={error} />}
        </div>
        <pre
          ref={logContainerRef}
          className="text-xs overflow-y-auto bg-gray-900 p-4 rounded-lg flex-grow whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar"
        >
          {logs || "Select a container to view its logs."}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
    </div>
  );
};

export default SystemLogsWidget;