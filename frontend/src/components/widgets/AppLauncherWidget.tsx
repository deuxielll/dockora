"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { getApps, refreshApps, manageContainer } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import AppIcon from '../AppIcon';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import ShareAppModal from '../modals/ShareAppModal';
import AppContextMenu from './AppContextMenu';
import EditLauncherItemModal from '../modals/EditLauncherItemModal';
import AddBookmarkModal from '../modals/AddBookmarkModal';
import toast from 'react-hot-toast';
import AppLauncherSkeleton from '../skeletons/AppLauncherSkeleton';

const AppLauncherWidget = ({ isInteracting, isLocked = false }) => {
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
  const [itemToEdit, setItemToEdit] = useState(null);
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);

  const appLauncherConfig = useMemo(() => {
    try {
      return settings.appLauncherConfig ? JSON.parse(settings.appLauncherConfig) : [];
    } catch { return []; }
  }, [settings.appLauncherConfig]);

  const customBookmarks = useMemo(() => {
    try {
      return settings.customBookmarks ? JSON.parse(settings.customBookmarks) : [];
    } catch { return []; }
  }, [settings.customBookmarks]);

  const fetchApps = useCallback(async () => {
    if (isInteracting) return;
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
  }, [isInteracting]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const saveConfig = useCallback((orderedItemIds) => {
    setSetting('appLauncherConfig', JSON.stringify(orderedItemIds));
  }, [setSetting]);

  const saveBookmarks = useCallback((bookmarks) => {
    setSetting('customBookmarks', JSON.stringify(bookmarks));
  }, [setSetting]);

  useEffect(() => {
    const appMap = new Map(apps.map(app => [app.id, { ...app, type: 'app' }]));
    const bookmarkMap = new Map(customBookmarks.map(bm => [bm.id, { ...bm, type: 'bookmark' }]));
    const allItemsMap = new Map([...appMap, ...bookmarkMap]);

    const configuredItems = appLauncherConfig.map(id => allItemsMap.get(id)).filter(Boolean);
    const configuredItemIds = new Set(configuredItems.map(item => item.id));
    const newItems = [...apps, ...customBookmarks].filter(item => !configuredItemIds.has(item.id));
    
    const finalItems = [...configuredItems, ...newItems];
    
    setLauncherItems(finalItems.map(item => ({
        id: item.id,
        type: item.type || (item.url.startsWith('http') ? 'bookmark' : 'app'),
        app: {
            id: item.id,
            name: item.name,
            url: item.url,
            status: item.status,
            iconUrl: item.iconUrl,
        }
    })));

    const finalItemIds = finalItems.map(item => item.id);
    if (JSON.stringify(finalItemIds) !== JSON.stringify(appLauncherConfig)) {
      saveConfig(finalItemIds);
    }
  }, [apps, customBookmarks, appLauncherConfig, saveConfig]);

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

    const getOptimisticStatus = (act) => {
      if (act === 'start' || act === 'unpause' || act === 'restart') return 'running (optimistic)';
      if (act === 'stop') return 'exited (optimistic)';
      if (act === 'pause') return 'paused (optimistic)';
      return 'updating...';
    };

    setLauncherItems(prevItems => prevItems.map(item => 
      item.app.id === appId ? { ...item, app: { ...item.app, status: getOptimisticStatus(action) } } : item
    ));

    try {
        await manageContainer(appId, action);
        toast.success(`'${action}' command sent. Verifying status...`, { id: toastId });
        setTimeout(() => fetchApps(), 2000); // Refresh after a delay
    } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send '${action}' command.`, { id: toastId });
        fetchApps();
    }
  };

  const handleDeleteApp = async (appId, appName) => {
    const toastId = toast.loading(`Deleting application "${appName}"...`);
    try {
      await manageContainer(appId, 'remove');
      toast.success(`Application "${appName}" deleted successfully.`, { id: toastId });
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to delete application "${appName}".`, { id: toastId });
    }
  };

  const handleSaveBookmark = (bookmark) => {
    const newBookmarks = [...customBookmarks, bookmark];
    saveBookmarks(newBookmarks);
    toast.success(`Bookmark "${bookmark.name}" added.`);
    setShowAddBookmarkModal(false);
  };

  const handleUpdateBookmark = (updatedBookmark) => {
    const newBookmarks = customBookmarks.map(bm => bm.id === updatedBookmark.id ? updatedBookmark : bm);
    saveBookmarks(newBookmarks);
    toast.success(`Bookmark "${updatedBookmark.name}" updated.`);
    setItemToEdit(null);
  };

  const handleDeleteBookmark = (bookmarkId) => {
    const newBookmarks = customBookmarks.filter(bm => bm.id !== bookmarkId);
    saveBookmarks(newBookmarks);
    toast.success(`Bookmark deleted.`);
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

  const handleDragOver = (e) => e.preventDefault();

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
    if (currentUser?.role !== 'admin' && item.type !== 'bookmark') return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return launcherItems;
    const lowerSearch = searchTerm.toLowerCase();
    return launcherItems.filter(item => item.app.name.toLowerCase().includes(lowerSearch));
  }, [launcherItems, searchTerm]);

  if (isLoading || isInteracting) return <AppLauncherSkeleton />;

  const AppItem = ({ item }) => {
    const isBookmark = item.type === 'bookmark';
    const status = !isBookmark ? item.app.status.toLowerCase() : '';
    const isRunning = status.includes('running') || status.includes('up');

    let statusColor = 'bg-gray-500';
    if (!isBookmark) {
      if (isRunning) statusColor = 'bg-green-500';
      else if (status.includes('paused')) statusColor = 'bg-yellow-500';
      else if (status.includes('exited') || status.includes('stopped')) statusColor = 'bg-red-500';
    }

    const isBeingDragged = draggedItem?.id === item.id;
    const isDropTarget = dropTargetId === item.id && draggedItem && draggedItem.id !== item.id;

    return (
      <a
        href={item.app.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={!isLocked}
        onDragStart={(e) => !isLocked && handleDragStart(e, item)}
        onDrop={(e) => !isLocked && handleDropOnItem(e, item)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => !isLocked && handleDragEnter(e, item)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => handleContextMenu(e, item)}
        className={`flex flex-col items-center text-center p-2 rounded-lg transition-all duration-200 group ${isBeingDragged ? 'opacity-30' : ''} ${isDropTarget ? 'scale-110 bg-accent/20' : 'hover:bg-dark-bg/50'}`}
      >
        <div className={`relative w-16 h-16 mb-2 bg-dark-bg shadow-neo-inset rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105 ${!isBookmark && !isRunning ? 'grayscale' : ''}`}>
          <AppIcon appId={item.app.id} appName={item.app.name} customIconUrl={item.app.iconUrl} />
          {!isBookmark && <span className={`absolute top-1 right-1 block h-3 w-3 rounded-full ${statusColor} border-2 border-dark-bg shadow-md`}></span>}
        </div>
        <p className={`text-xs font-semibold text-gray-200 w-full h-8 flex items-center justify-center text-center break-words`}>{item.app.name}</p>
      </a>
    );
  };

  const AddBookmarkTile = () => (
    <button
      onClick={() => setShowAddBookmarkModal(true)}
      className="flex flex-col items-center justify-center text-center p-2 rounded-lg transition-all duration-200 group hover:bg-dark-bg/50 w-full h-full"
      title="Add bookmark"
    >
      <div className="relative w-16 h-16 mb-2 bg-dark-bg shadow-neo-inset rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <Plus size={32} className="text-gray-400" />
      </div>
      <p className="text-xs font-semibold text-gray-400 w-full h-8 flex items-center justify-center text-center break-words">Add Bookmark</p>
    </button>
  );

  return (
    <>
      <div className="flex flex-col h-full" onDragOver={handleDragOver}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" size={20} />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-400"
            />
          </div>
          <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-2 ml-2 rounded-full hover:shadow-neo-inset transition-all text-gray-200" title="Refresh Apps">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {filteredItems.map(item => <AppItem key={item.id} item={item} />)}
            {!isLocked && <AddBookmarkTile />}
          </div>
        </div>
      </div>
      {contextMenu && (
        <AppContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onShare={() => { setAppToShare(contextMenu.item.app); setContextMenu(null); }}
          onAction={(appId, action) => { handleAppAction(appId, action); setContextMenu(null); }}
          onEdit={() => { setItemToEdit(contextMenu.item); setContextMenu(null); }}
          onDelete={() => {
            if (contextMenu.item.type === 'app') {
              handleDeleteApp(contextMenu.item.app.id, contextMenu.item.app.name);
            } else {
              handleDeleteBookmark(contextMenu.item.app.id);
            }
            setContextMenu(null);
          }}
        />
      )}
      {appToShare && <ShareAppModal app={appToShare} onClose={() => setAppToShare(null)} />}
      {showAddBookmarkModal && <AddBookmarkModal onClose={() => setShowAddBookmarkModal(false)} onSave={handleSaveBookmark} />}
      {itemToEdit && (
        <EditLauncherItemModal
          item={itemToEdit}
          onClose={() => setItemToEdit(null)}
          onSaveApp={() => { setItemToEdit(null); fetchApps(); }}
          onSaveBookmark={handleUpdateBookmark}
        />
      )}
    </>
  );
};

export default AppLauncherWidget;