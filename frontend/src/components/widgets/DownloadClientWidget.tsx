"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, Upload, Play, Pause, Trash2, RefreshCw, ChevronDown, ChevronUp, Link, File, Loader, AlertTriangle
} from 'lucide-react';
import {
  getQbittorrentDownloads, addQbittorrentDownload, togglePauseResumeQbittorrentDownload, deleteQbittorrentDownload
} from '../../services/api';
import { useSettings } from '../../hooks/useSettings';
import { useInterval } from '../../hooks/useInterval';
import DownloadClientWidgetSkeleton from '../skeletons/DownloadClientWidgetSkeleton';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
};

const formatETA = (seconds) => {
  if (seconds === -1) return '∞'; // qBittorrent's "infinity" ETA
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
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [magnetLink, setMagnetLink] = useState('');
  const [torrentFile, setTorrentFile] = useState(null);
  const [isAddingDownload, setIsAddingDownload] = useState(false);
  const fileInputRef = useRef(null);

  // Access qBittorrent settings from the downloadClientConfig object
  const qbittorrentConfig = settings.downloadClientConfig || {};
  const qbittorrentUrl = qbittorrentConfig.qbittorrentUrl;

  const fetchDownloads = useCallback(async () => {
    if (isInteracting) return; // Don't fetch if widget is being dragged/resized

    setIsRefreshing(true);
    setError(null);
    try {
      const res = await getQbittorrentDownloads();
      setActiveDownloads(res.data.active);
      setCompletedDownloads(res.data.completed);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to fetch downloads.";
      setError(errorMessage);
      console.error("Failed to fetch qBittorrent downloads:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isInteracting]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  useInterval(fetchDownloads, 5000); // Refresh every 5 seconds

  const handleAddDownload = async () => {
    if (!magnetLink && !torrentFile) {
      toast.error("Please enter a magnet link or select a torrent file.");
      return;
    }
    setIsAddingDownload(true);
    setError(null);
    try {
      if (magnetLink) {
        await addQbittorrentDownload({ urls: [magnetLink] });
        toast.success("Magnet link added successfully!");
        setMagnetLink('');
      } else if (torrentFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Content = btoa(e.target.result); // Base64 encode binary content
          await addQbittorrentDownload({ torrent_file_base64: base64Content });
          toast.success("Torrent file added successfully!");
          setTorrentFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(torrentFile);
      }
      fetchDownloads(); // Refresh list
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to add download.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAddingDownload(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTorrentFile(file);
      setMagnetLink(''); // Clear magnet link if file is selected
    } else {
      setTorrentFile(null);
    }
  };

  const handleTogglePauseResume = async (hashes, action) => {
    try {
      await togglePauseResumeQbittorrentDownload(hashes, action);
      toast.success(`Download(s) ${action}d.`);
      fetchDownloads();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || `Failed to ${action} download(s).`;
      toast.error(errorMessage);
    }
  };

  const handleDeleteDownload = async (hashes, deleteFiles = false) => {
    if (!window.confirm(`Are you sure you want to delete ${hashes.length} download(s)? ${deleteFiles ? 'This will also delete the associated files.' : ''}`)) {
      return;
    }
    try {
      await deleteQbittorrentDownload(hashes, deleteFiles);
      toast.success(`Download(s) deleted.`);
      fetchDownloads();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to delete download(s).";
      toast.error(errorMessage);
    }
  };

  if (isLoading || isInteracting) {
    return <DownloadClientWidgetSkeleton />;
  }

  if (!qbittorrentUrl) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <p className="font-semibold text-gray-200">qBittorrent WebUI Not Configured</p>
        <p className="text-sm text-gray-400 mt-2">
          Please configure your qBittorrent WebUI URL, username, and password in the <span className="text-accent">Settings</span> to use this widget.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
        <AlertTriangle size={48} className="mb-4" />
        <p className="font-bold text-lg">Error</p>
        <p className="text-sm text-gray-400 mt-2">{error}</p>
        <button onClick={fetchDownloads} className="mt-4 px-4 py-2 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset text-sm font-semibold">
          <RefreshCw size={16} className="inline-block mr-2" /> Retry
        </button>
      </div>
    );
  }

  const inputStyles = "w-full p-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const actionButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const renderDownloadItem = (download, isCompleted = false) => {
    const isPaused = download.state.includes('paused');
    const isDownloading = download.state.includes('downloading') || download.state.includes('stalled_dl') || download.state.includes('checkingDL') || download.state.includes('metaDL') || download.state.includes('forced_dl');
    const isUploading = download.state.includes('uploading') || download.state.includes('stalled_up') || download.state.includes('checkingUP') || download.state.includes('forced_up');
    const isError = download.state.includes('error');

    let statusColor = 'text-gray-400';
    if (isDownloading) statusColor = 'text-blue-400';
    else if (isUploading) statusColor = 'text-green-400';
    else if (isPaused) statusColor = 'text-yellow-400';
    else if (isError) statusColor = 'text-red-500';
    else if (isCompleted) statusColor = 'text-green-500';

    return (
      <div key={download.hash} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-gray-200 text-sm truncate" title={download.name}>{download.name}</p>
          <span className={`text-xs font-medium capitalize ${statusColor}`}>{download.state.replace(/_/g, ' ')}</span>
        </div>
        {!isCompleted && (
          <>
            <div className="w-full bg-gray-700 rounded-full h-2 shadow-neo-inset mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(download.progress, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-3">
              <span>{download.progress.toFixed(1)}%</span>
              <span>ETA: {formatETA(download.eta)}</span>
              <span>{formatBytes(download.size)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Download size={12} className="text-blue-400" />
                <span>{formatSpeed(download.download_speed)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Upload size={12} className="text-green-400" />
                <span>{formatSpeed(download.upload_speed)}</span>
              </div>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 mt-3">
          {!isCompleted && (
            <button
              onClick={() => handleTogglePauseResume([download.hash], isPaused ? 'resume' : 'pause')}
              className={`${actionButtonStyles} ${isPaused ? 'text-green-500' : 'text-yellow-500'}`}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          <button
            onClick={() => handleDeleteDownload([download.hash], false)}
            className={`${actionButtonStyles} text-red-500`}
            title="Delete (keep files)"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteDownload([download.hash], true)}
            className={`${actionButtonStyles} text-red-700`}
            title="Delete (remove files)"
          >
            <Trash2 size={16} />
            <span className="sr-only">Delete with files</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add Download Section */}
      <div className="mb-4 flex-shrink-0">
        <div className="relative mb-2">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Magnet link or .torrent URL"
            value={magnetLink}
            onChange={(e) => { setMagnetLink(e.target.value); setTorrentFile(null); }}
            className={`${inputStyles} pl-10`}
            disabled={isAddingDownload}
          />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".torrent"
            disabled={isAddingDownload}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className={`${buttonStyles} flex items-center gap-2 text-sm text-gray-300 flex-grow`}
            disabled={isAddingDownload}
          >
            <File size={16} /> {torrentFile ? torrentFile.name : 'Select .torrent file'}
          </button>
          <button
            onClick={handleAddDownload}
            className={`${buttonStyles} text-accent`}
            disabled={isAddingDownload || (!magnetLink && !torrentFile)}
            title="Add Download"
          >
            {isAddingDownload ? <Loader size={20} className="animate-spin" /> : <Plus size={20} />}
          </button>
        </div>
      </div>

      {/* Active Downloads */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h4 className="font-semibold text-gray-200">Active Downloads ({activeDownloads.length})</h4>
        <button onClick={fetchDownloads} disabled={isRefreshing} className={`${buttonStyles} text-gray-300`} title="Refresh">
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-3 mb-4">
        {activeDownloads.length > 0 ? (
          activeDownloads.slice(0, 7).map(download => renderDownloadItem(download))
        ) : (
          <p className="text-center text-gray-400 py-4">No active downloads.</p>
        )}
      </div>

      {/* Completed Downloads */}
      <div className="flex-shrink-0 border-t border-gray-700/50 pt-4">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2 w-full text-left text-sm font-semibold text-gray-200 p-2 rounded-lg hover:bg-dark-bg-secondary transition-colors"
        >
          {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Completed Downloads ({completedDownloads.length})
        </button>
        {showCompleted && (
          <div className="mt-3 overflow-y-auto max-h-40 no-scrollbar pr-2 space-y-3">
            {completedDownloads.length > 0 ? (
              completedDownloads.map(download => renderDownloadItem(download, true))
            ) : (
              <p className="text-center text-gray-400 py-4">No completed downloads.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadClientWidget;