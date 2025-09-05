import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { getApps, refreshApps, manageContainer } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import AppIcon from '../AppIcon';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import ShareAppModal from '../modals/ShareAppModal';
import AppContextMenu from './AppContextMenu';
import EditAppModal from '../modals/EditAppModal';
import toast from 'react-hot-toast';

const AppLauncherWidget = () => {
  const { settings, setSetting } = useSettings();
  const { currentUser } = useAuth();
  const [apps, setApps] = useState([]);
  const [launcherItems, setLauncherItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [appToShare, setAppToShare] = useState(null);
  const [appToEdit, setAppToEdit] = useState(null);

  const appLauncherConfig = useMemo(() => {
    try {
      return settings.appLauncherConfig ? JSON.parse(settings.appLauncherConfig) : null;
    } catch { return null; }
  }, [settings.appLauncherConfig]);

  const fetchApps = useCallback(async () => {
    try {
      const res = await getApps();
      const installedApps = res.data
        .map(c => {
          const portMapping = c.ports && c.ports[0];
          let url = null;
          if (portMapping) {
            const hostPart = portMapping.split('->')[0];
            const port = hostPart.split(':').pop();
            if (port && !isNaN(port)) {
              url = `http://${window.location.hostname}:${port}`;
            }
          }
          if (!url) return null;
          return { id: c.id, name: c.name, url, status: c.status };
        })
        .filter(Boolean);
      setApps(installedApps);
    } catch (error) {
      console.error("Failed to fetch installed apps:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const saveConfig = useCallback((orderedAppIds) => {
    setSetting('appLauncherConfig', JSON.stringify(orderedAppIds));
  }, [setSetting]);

  useEffect(() => {
    const appMap = new Map(apps.map(app => [app.id, app]));
    let orderedAppIds = [];

    if (appLauncherConfig && Array.isArray(appLauncherConfig)) {
      if (appLauncherConfig.length > 0 && typeof appLauncherConfig[0] === 'object') {
        orderedAppIds = appLauncherConfig.flatMap(item => {
          if (item.type === 'app') return [item.id];
          if (item.type === 'group') return item.appIds || [];
          return [];
        });
      } else {
        orderedAppIds = appLauncherConfig;
      }
    }

    const configuredApps = orderedAppIds.map(id => appMap.get(id)).filter(Boolean);
    const configuredAppIds = new Set(configuredApps.map(app => app.id));
    const newApps = apps.filter(app => !configuredAppIds.has(app.id));
    
    const finalApps = [...configuredApps, ...newApps];
    
    setLauncherItems(finalApps.map(app => ({ type: 'app', id: app.id, app })));

    const finalAppIds = finalApps.map(app => app.id);
    if (JSON.stringify(finalAppIds) !== JSON.stringify(appLauncherConfig)) {
      saveConfig(finalAppIds);
    }
  }, [apps, appLauncherConfig, saveConfig]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshApps();
      await fetchApps();
    } catch (error) {
      console.error("Failed to manually refresh apps:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAppAction = async (appId, action) => {
    const toastId = toast.loading(`Sending '${action}' command...`);

    const originalApp = apps.find(a => a.id === appId);
    if (!originalApp) return;
    const originalStatus = originalApp.status;

    // Optimistic update
    const getOptimisticStatus = (act) => {
      if (act === 'start' || act === 'unpause' || act === 'restart') return 'running (optimistic)';
      if (act === 'stop') return 'exited (optimistic)';
      if (act === 'pause') return 'paused (optimistic)';
      return 'updating...';
    };

    setLauncherItems(prevItems => prevItems.map(item => {
      if (item.app.id === appId) {
        return { ...item, app: { ...item.app, status: getOptimisticStatus(action) } };
      }
      return item;
    }));

    try {
        await manageContainer(appId, action);
        toast.success(`'${action}' command sent. Verifying status...`, { id: toastId });

        // Poll for status change
        let attempts = 0;
        const maxAttempts = 10; // 10 attempts over 5 seconds
        const pollInterval = 500; // 0.5 seconds

        const poll = setInterval(async () => {
            attempts++;
            try {
                const res = await getApps();
                const updatedApps = res.data;
                const updatedApp = updatedApps.find(a => a.id === appId);
                
                if (updatedApp && updatedApp.status !== originalStatus) {
                    clearInterval(poll);
                    toast.success(`Status for ${updatedApp.name} updated.`, { id: toastId });
                    fetchApps(); // This will trigger the useEffect to rebuild launcherItems
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    toast.warn(`Could not verify status change for ${originalApp.name}. Refreshing list.`, { id: toastId });
                    fetchApps(); // Fallback to a final fetch
                }
            } catch (pollErr) {
                // Ignore poll errors
            }
        }, pollInterval);

    } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send '${action}' command.`, { id: toastId });
        // Revert optimistic update on failure by fetching the real state
        fetchApps();
    }
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDragEnter = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.id !== targetItem.id) {
      setDropTargetId(targetItem.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnItem = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newItems = [...launcherItems];
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = newItems.findIndex(item => item.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setLauncherItems(newItems);
    saveConfig(newItems.map(item => item.id));
  };

  const handleContextMenu = (e, item) => {
    if (currentUser?.role !== 'admin') return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
        x: e.clientX,
        y: e.clientY,
        app: item.app,
    });
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return launcherItems;
    const lowerSearch = searchTerm.toLowerCase();
    return launcherItems.filter(item => item.app.name.toLowerCase().includes(lowerSearch));
  }, [launcherItems, searchTerm]);

  if (isLoading) {
    return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const AppItem = ({ item }) => {
    const status = item.app.status.toLowerCase();
    const isRunning = status.includes('running') || status.includes('up');
    const isPaused = status.includes('paused');
    const isStopped = status.includes('exited') || status.includes('stopped');

    let statusColor = '';
    if (isRunning) {
      statusColor = 'bg-green-500';
    } else if (isPaused) {
      statusColor = 'bg-yellow-500';
    } else if (isStopped) {
      statusColor = 'bg-red-500';
    } else {
      statusColor = 'bg-gray-500';
    }

    const isBeingDragged = draggedItem?.id === item.id;
    const isDropTarget = dropTargetId === item.id && draggedItem && draggedItem.id !== item.id;

    return (
      <a
        href={item.app.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDrop={(e) => handleDropOnItem(e, item)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, item)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => handleContextMenu(e, item)}
        className={`flex flex-col items-center text-center p-2 rounded-lg transition-all duration-200 group ${isBeingDragged ? 'opacity-30' : ''} ${isDropTarget ? 'scale-110 bg-accent/20' : 'hover:bg-dark-bg/50'}`}
      >
        <div className="relative w-16 h-16 mb-2 bg-dark-bg shadow-neo-inset rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          <div className={(isPaused || isStopped) ? 'filter grayscale opacity-60' : ''}>
            <AppIcon appId={item.app.id} appName={item.app.name} />
          </div>
          <span className={`absolute top-1 right-1 block h-3 w-3 rounded-full ${statusColor} border-2 border-dark-bg shadow-md`}></span>
        </div>
        <p className={`text-xs font-semibold text-gray-200 w-full h-8 flex items-center justify-center text-center break-words ${(isPaused || isStopped) ? 'opacity-60' : ''}`}>{item.app.name}</p>
      </a>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full" onDragOver={handleDragOver}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-400"
            />
          </div>
          <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-2 ml-2 rounded-full hover:shadow-neo-inset transition-all" title="Refresh Apps">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {filteredItems.map(item => (
                <AppItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center text-gray-400">
              <p>No applications found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
            </div>
          )}
        </div>
      </div>
      {contextMenu && (
        <AppContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          app={contextMenu.app}
          onShare={() => {
            setAppToShare(contextMenu.app);
            setContextMenu(null);
          }}
          onAction={(appId, action) => {
            handleAppAction(appId, action);
            setContextMenu(null);
          }}
          onRename={() => {
            setAppToEdit(contextMenu.app);
            setContextMenu(null);
          }}
        />
      )}
      {appToShare && (
        <ShareAppModal
          app={appToShare}
          onClose={() => setAppToShare(null)}
        />
      )}
      {appToEdit && (
        <EditAppModal
          app={appToEdit}
          onClose={() => setAppToEdit(null)}
          onSuccess={() => {
            setAppToEdit(null);
            fetchApps();
          }}
        />
      )}
    </>
  );
};

export default AppLauncherWidget;