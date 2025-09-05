import React, { useState, useEffect } from 'react';
import { Wifi, Server, Globe, ArrowDown, ArrowUp, Loader, MapPin, Signal, WifiOff, Zap, Clock, CalendarDays, Calendar, Network, Router } from 'lucide-react';
import { getNetworkStats } from '../../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

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

const MAX_DATA_POINTS = 20;

const NetworkingWidget = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({
    labels: Array(MAX_DATA_POINTS).fill(''),
    upload: Array(MAX_DATA_POINTS).fill(0),
    download: Array(MAX_DATA_POINTS).fill(0),
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getNetworkStats();
        setStats(res.data);
        setHistory(prev => {
          const now = new Date();
          const newLabels = [...prev.labels.slice(1), now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })];
          const newUpload = [...prev.upload.slice(1), res.data.upload_speed / 1024]; // in KB/s
          const newDownload = [...prev.download.slice(1), res.data.download_speed / 1024]; // in KB/s
          return { labels: newLabels, upload: newUpload, download: newDownload };
        });
      } catch (error) {
        console.error("Failed to fetch network stats:", error);
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const chartData = {
    labels: history.labels,
    datasets: [
      {
        label: 'Download',
        data: history.download,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Upload',
        data: history.upload,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          callback: (value) => `${value} KB/s`,
        },
        grid: { color: 'rgba(107, 114, 128, 0.2)' },
      },
      x: {
        ticks: { display: false },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} KB/s`,
        },
      },
    },
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-grow flex items-center justify-center"><Loader className="animate-spin text-blue-500" /></div>;
    }
    if (!stats) {
      return <div className="flex-grow flex items-center justify-center text-sm text-gray-500">Could not load network data.</div>;
    }

    // Display detailed errors if present
    if (stats.errors && stats.errors.length > 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 text-sm p-4">
          <p className="font-bold mb-2">Network Data Errors:</p>
          {stats.errors.map((err, index) => (
            <p key={index} className="text-xs mb-1">{err}</p>
          ))}
          <p className="mt-4 text-gray-400">Some network data could not be loaded. Check backend logs for more details.</p>
        </div>
      );
    }

    return (
      <>
        <div className="h-24 mb-4">
          <Line options={chartOptions} data={chartData} />
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-blue-400">
            <ArrowDown size={16} />
            <span>{formatSpeed(stats.download_speed)}</span>
          </div>
          <div className="flex items-center gap-2 text-green-400">
            <ArrowUp size={16} />
            <span>{formatSpeed(stats.upload_speed)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-col gap-2 text-sm text-gray-400">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Globe size={16} />
              <span>{stats.public_ip}</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.connection_type === 'wifi' && <Wifi size={16} />}
              {stats.connection_type === 'lan' && <Server size={16} />}
              <span className="capitalize">{stats.connection_type}</span>
            </div>
          </div>
          {stats.location && stats.location !== 'N/A' && (
            <div className="flex items-center gap-2 text-xs self-start">
              <MapPin size={14} />
              <span>{stats.location}</span>
            </div>
          )}
          {/* Network status details */}
          <div className="flex justify-between items-center w-full mt-2">
            <div className="flex items-center gap-2">
              {stats.online_status ? <Signal size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
              <span className={stats.online_status ? "text-green-400" : "text-red-400"}>{stats.online_status ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-purple-400" />
              <span>{typeof stats.ping_latency === 'number' ? `${stats.ping_latency.toFixed(1)} ms` : stats.ping_latency}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Loss:</span>
              <span>{typeof stats.packet_loss === 'number' ? `${stats.packet_loss.toFixed(0)}%` : stats.packet_loss}</span>
            </div>
          </div>
          {/* IP Addresses and DNS */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-col gap-2 text-sm text-gray-400">
            <p className="font-semibold text-gray-200 mb-2">IP Details:</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Network size={16} />
                <span>Local IP:</span>
              </div>
              <span>{stats.local_ip}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Network size={16} />
                <span>Subnet:</span>
              </div>
              <span>{stats.subnet_mask}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Router size={16} />
                <span>Gateway:</span>
              </div>
              <span>{stats.gateway}</span>
            </div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Network size={16} />
                <span>DNS:</span>
              </div>
              <div className="text-right">
                {stats.dns_servers && stats.dns_servers.length > 0 ? (
                  stats.dns_servers.map((dns, index) => (
                    <span key={index} className="block">{dns}</span>
                  ))
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>
          </div>
          {/* Data Usage */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-col gap-2 text-sm text-gray-400">
            <p className="font-semibold text-gray-200 mb-2">Data Usage:</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>Session:</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown size={14} className="text-blue-400" />
                <span>{formatBytes(stats.session_download_total)}</span>
                <ArrowUp size={14} className="text-green-400" />
                <span>{formatBytes(stats.session_upload_total)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                <span>Daily:</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown size={14} className="text-blue-400" />
                <span>{formatBytes(stats.daily_download_total)}</span>
                <ArrowUp size={14} className="text-green-400" />
                <span>{formatBytes(stats.daily_upload_total)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>Monthly:</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown size={14} className="text-blue-400" />
                <span>{formatBytes(stats.monthly_download_total)}</span>
                <ArrowUp size={14} className="text-green-400" />
                <span>{formatBytes(stats.monthly_upload_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
    </div>
  );
};

export default NetworkingWidget;