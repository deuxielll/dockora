"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { getTorrents, addTorrent, manageTorrent } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import { Download, Play, Pause, StopCircle, Trash2, Plus, Magnet, FileUp, RefreshCw, AlertTriangle, WifiOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInterval } from '../../hooks/useInterval';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
};

const formatEta = (seconds) => {
  if (seconds === -1) return 'N/A';
  if (seconds === -2) return 'Done';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const DownloadClientWidget = ({ isInteracting }) => {
  const { settings } = useSettings();
  const [torrents, setTorrents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingTorrent, setIsAddingTorrent] = useState(false);
  const [magnetLink, setMagnetLink] = useState('');
  const [torrentFile, setTorrentFile] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [actionLoadingStates, setActionLoadingStates] = useState({}); // { torrentId: boolean }
  const fileInputRef = useRef(null);

  const clientConfig = settings.downloadClientConfig ? JSON.parse(settings.downloadClientConfig) : null;
  const isClientConfigured = clientConfig && clientConfig.type !== 'none' && clientConfig.url;

  const fetchTorrents = useCallback(async () => {
    if (!isClientConfigured || isInteracting) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await getTorrents();
      setTorrents(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch torrents.');
      console.error("Error fetching torrents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isClientConfigured, isInteracting]);

  useEffect(() => {
    fetchTorrents();
  }, [fetchTorrents]);

  useInterval(fetchTorrents, 5000); // Refresh torrents every 5 seconds

  const handleTorrentAction = async (torrentId, action, deleteData = false) => {
    setActionLoadingStates(prev => ({ ...prev, [torrentId]: true }));
    const toastId = toast.loading(`Sending '${action}' command...`);
    try {
      const actualAction = deleteData ? 'remove-and-delete-data' : action;
      await manageTorrent(torrentId, actualAction);
      toast.success(`Torrent action '${action}' successful.`, { id: toastId });
      fetchTorrents(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to perform '${action}' action.`, { id: toastId });
    } finally {
      setActionLoadingStates(prev => { const newState = { ...prev }; delete newState[torrentId]; return newState; });
    }
  };

  const handleAddTorrent = async (e) => {
    e.preventDefault();
    if (!magnetLink && !torrentFile) {
      toast.error('Please provide a magnet link or upload a .torrent file.');
      return;
    }
    setIsSubmittingAdd(true);
    const toastId = toast.loading('Adding torrent...');
    try {
      let data = {};
      if (magnetLink) {
        data.magnet_link = magnetLink;
      } else if (torrentFile) {
        const reader = new FileReader();
        reader.readAsDataURL(torrentFile);
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            data.torrent_file_base64 = reader.result.split(',')[1]; // Get base64 content
            resolve();
          };
          reader.onerror = error => reject(error);
        });
      }
      await addTorrent(data);
      toast.success('Torrent added successfully!', { id: toastId });
      setMagnetLink('');
      setTorrentFile(null);
      setIsAddingTorrent(false);
      fetchTorrents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add torrent.', { id: toastId });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.torrent')) {
      setTorrentFile(file);
      setMagnetLink(''); // Clear magnet link if file is selected
    } else {
      setTorrentFile(null);
      toast.error('Please select a valid .torrent file.');
    }
  };

  const renderContent = () => {
    if (!isClientConfigured) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
          <Download size={48} className="text-gray-400 mb-4" />
          <p className="font-semibold text-gray-200">Download Client Not Configured</p>
          <p className="text-sm text-gray-400 mt-2">Please configure your download client in the settings to use this widget.</p>
        </div>
      );
    }

    if (isLoading) {
      return <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>;
    }

    if (error) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          <AlertTriangle size={48} className="mb-4" />
          <p className="font-bold text-lg">Error Loading Torrents</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      );
    }

    if (torrents.length === 0 && !isAddingTorrent) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
          <Download size={48} className="mb-4" />
          <p className="font-semibold text-gray-200">No Torrents Found</p>
          <p className="text-sm">Add your first torrent to get started!</p>
        </div>
      );
    }

    return (
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 no-scrollbar">
        {torrents.map(torrent => (
          <div key={torrent.id} className="bg-dark-bg-secondary shadow-neo-inset p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-gray-200 text-sm truncate">{torrent.name}</p>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => handleTorrentAction(torrent.id, 'start')}
                  disabled={actionLoadingStates[torrent.id]}
                  className="p-1 rounded-full hover:shadow-neo-inset transition-all text-green-500"
                  title="Start"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => handleTorrentAction(torrent.id, 'stop')}
                  disabled={actionLoadingStates[torrent.id]}
                  className="p-1 rounded-full hover:shadow-neo-inset transition-all text-yellow-500"
                  title="Stop"
                >
                  <StopCircle size={16} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to remove "${torrent.name}"? This will NOT delete the downloaded data.`)) {
                      handleTorrentAction(torrent.id, 'remove');
                    }
                  }}
                  disabled={actionLoadingStates[torrent.id]}
                  className="p-1 rounded-full hover:shadow-neo-inset transition-all text-red-500"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="capitalize text-gray-200">{torrent.status.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Progress:</span>
                <span className="text-gray-200">{torrent.progress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Download:</span>
                <span className="text-gray-200">{formatSpeed(torrent.rate_download)}</span>
              </div>
              <div className="flex justify-between">
                <span>Upload:</span>
                <span className="text-gray-200">{formatSpeed(torrent.rate_upload)}</span>
              </div>
              <div className="flex justify-between">
                <span>ETA:</span>
                <span className="text-gray-200">{formatEta(torrent.eta)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "px-4 py-2 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="font-semibold text-gray-200">Torrents</h3>
        <div className="flex gap-2">
          <button onClick={fetchTorrents} disabled={isLoading || isInteracting} className="p-2 rounded-full hover:shadow-neo-inset transition-all text-gray-200" title="Refresh Torrents">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsAddingTorrent(!isAddingTorrent)} disabled={!isClientConfigured || isInteracting} className="p-2 rounded-full hover:shadow-neo-inset transition-all text-gray-200" title="Add Torrent">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {isAddingTorrent && isClientConfigured && (
        <form onSubmit={handleAddTorrent} className="mb-4 p-3 bg-dark-bg-secondary rounded-lg shadow-neo-inset flex-shrink-0">
          <div className="mb-3">
            <label htmlFor="magnetLink" className="block text-sm font-medium mb-2 text-gray-400">Magnet Link</label>
            <input
              type="text"
              id="magnetLink"
              value={magnetLink}
              onChange={(e) => { setMagnetLink(e.target.value); setTorrentFile(null); }}
              className={inputStyles}
              placeholder="magnet:?xt=urn:btih:..."
              disabled={isSubmittingAdd}
            />
          </div>
          <div className="flex items-center justify-center text-gray-400 mb-3">
            <span className="w-full border-t border-gray-700/50"></span>
            <span className="px-2">OR</span>
            <span className="w-full border-t border-gray-700/50"></span>
          </div>
          <div className="mb-3">
            <label htmlFor="torrentFile" className="block text-sm font-medium mb-2 text-gray-400">Upload .torrent File</label>
            <input
              type="file"
              id="torrentFile"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".torrent"
              className="block w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-dark-bg file:text-accent
                hover:file:bg-gray-700/50 file:shadow-neo-inset
                cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmittingAdd}
            />
            {torrentFile && <p className="text-xs text-gray-400 mt-1">Selected: {torrentFile.name}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddingTorrent(false)} className={`${buttonStyles} !text-gray-300`} disabled={isSubmittingAdd}>Cancel</button>
            <button type="submit" className={buttonStyles} disabled={isSubmittingAdd || (!magnetLink && !torrentFile)}>
              {isSubmittingAdd ? 'Adding...' : 'Add Torrent'}
            </button>
          </div>
        </form>
      )}

      {renderContent()}
    </div>
  );
};

export default DownloadClientWidget;