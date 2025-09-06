import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDown, ArrowUp, Settings, Loader, WifiOff } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { getDownloadClientStats, getTorrents, torrentAction } from '../../services/api';
import TorrentItem from './download-client/TorrentItem';
import TorrentContextMenu from './download-client/TorrentContextMenu';
import toast from 'react-hot-toast';

const formatSpeed = (bytes) => {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
};

const DownloadClientWidget = () => {
  const [stats, setStats] = useState(null);
  const [torrents, setTorrents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const { settings } = useSettings();
  
  const config = settings.downloadClientConfig ? JSON.parse(settings.downloadClientConfig) : { type: 'none' };

  const fetchData = useCallback(async () => {
    if (config.type === 'none') {
      setIsLoading(false);
      setStats(null);
      setTorrents([]);
      setError(null); // Clear any previous errors
      return;
    }
    try {
      const [statsRes, torrentsRes] = await Promise.all([
        getDownloadClientStats(),
        getTorrents()
      ]);
      setStats(statsRes.data);
      setTorrents(torrentsRes.data);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to fetch client data.";
      setError(errorMessage);
      console.error("Download client error:", err);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [config.type, isLoading, settings.downloadClientConfig]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleContextMenu = (event, torrent) => {
    event.preventDefault();
    setContextMenu({ x: event.pageX, y: event.pageY, torrent });
  };

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, [closeContextMenu]);

  const handleTorrentAction = async (hash, action) => {
    try {
      await torrentAction(hash, action);
      toast.success(`Action '${action}' sent successfully.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to perform action '${action}'.`);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-grow flex items-center justify-center"><Loader className="animate-spin text-gray-200" /></div>;
    }
    if (config.type === 'none') {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <Settings size={48} className="text-gray-200 mb-4" />
          <p className="font-semibold text-gray-200">Download Client</p>
          <p className="text-sm text-gray-400">No client configured in Settings.</p>
        </div>
      );
    }
    if (error && error.includes("network error")) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          <WifiOff size={48} className="mb-4" />
          <p className="font-bold text-lg">No Internet Connection</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      );
    }
    if (error) {
      return <div className="flex-grow flex items-center justify-center text-center text-red-500 text-sm p-4">{error}</div>;
    }
    if (stats) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex justify-around items-center flex-grow">
                <div className="text-center">
                  <ArrowDown className="mx-auto text-green-500" />
                  <p className="text-lg font-bold">{formatSpeed(stats.dl_speed)}</p>
                  <p className="text-xs text-gray-400">Download</p>
                </div>
                <div className="text-center">
                  <ArrowUp className="mx-auto text-blue-500" />
                  <p className="text-lg font-bold">{formatSpeed(stats.up_speed)}</p>
                  <p className="text-xs text-gray-400">Upload</p>
                </div>
            </div>
            <p className="text-sm font-semibold capitalize text-gray-400 flex-shrink-0">{config.type}</p>
          </div>
          <div className="flex-grow overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-0">
            {torrents.length > 0 ? (
              torrents.map(t => <TorrentItem key={t.hash} torrent={t} onContextMenu={(e) => handleContextMenu(e, t)} />)
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No active torrents.</div>
            )}
          </div>
          {torrents.length > 0 && (
            <div className="text-center mt-3 flex-shrink-0">
              <a href={config.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">View all in Web UI</a>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {renderContent()}
      {contextMenu && <TorrentContextMenu {...contextMenu} onAction={handleTorrentAction} onClose={closeContextMenu} />}
    </>
  );
};

export default DownloadClientWidget;