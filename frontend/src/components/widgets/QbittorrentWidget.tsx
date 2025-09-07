"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Loader, WifiOff, AlertTriangle } from 'lucide-react';
import { getQbittorrentDownloads } from '../../services/api';
import { useSettings } from '../../hooks/useSettings';
import QbittorrentWidgetSkeleton from '../skeletons/QbittorrentWidgetSkeleton'; // Import skeleton

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytes) => {
  if (bytes === 0) return '0 B/s';
  return `${formatBytes(bytes)}/s`;
};

const QbittorrentWidget = ({ isInteracting }) => {
  const { settings } = useSettings();
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const clientConfig = useMemo(() => {
    // The useSettings hook already parses the JSON string, so we can use it directly.
    return settings.downloadClientConfig || null;
  }, [settings.downloadClientConfig]);

  const fetchDownloads = useCallback(async () => {
    // Only fetch if not interacting and qBittorrent is configured
    if (isInteracting || !clientConfig || clientConfig.type !== 'qbittorrent') {
      if (!clientConfig || clientConfig.type !== 'qbittorrent') {
        setError("qBittorrent client not configured.");
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await getQbittorrentDownloads();
      setDownloads(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch qBittorrent downloads.");
      console.error("qBittorrent fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isInteracting, clientConfig]);

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchDownloads]);

  const renderContent = () => {
    if (isLoading) {
      return <QbittorrentWidgetSkeleton />;
    }

    if (error) {
      const isConfigError = error.includes("qBittorrent client not configured") || error.includes("qBittorrent URL is missing");
      const isConnectionError = error.includes("Failed to connect to qBittorrent");

      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          {isConfigError ? (
            <AlertTriangle size={48} className="mb-4" />
          ) : isConnectionError ? (
            <WifiOff size={48} className="mb-4" />
          ) : (
            <Download size={48} className="mb-4" />
          )}
          <p className="font-bold text-lg">Download Client Error</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
          {isConfigError && <p className="text-xs text-gray-400 mt-1">Please configure qBittorrent in Settings.</p>}
        </div>
      );
    }

    if (downloads.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
          <Download size={48} className="mb-4" />
          <p className="font-semibold text-gray-200">No Active Downloads</p>
          <p className="text-sm">Your qBittorrent queue is currently empty.</p>
        </div>
      );
    }

    return (
      <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-3">
        {downloads.map((torrent) => (
          <div key={torrent.hash} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-200 text-sm truncate pr-2" title={torrent.name}>{torrent.name}</p>
              <span className="text-xs font-bold text-accent">{torrent.progress}%</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2 shadow-neo-inset mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${torrent.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>DL: {formatSpeed(torrent.download_speed)}</span>
              <span>UP: {formatSpeed(torrent.upload_speed)}</span>
              <span className="capitalize">{torrent.state.replace(/_/g, ' ')}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
    </div>
  );
};

export default QbittorrentWidget;