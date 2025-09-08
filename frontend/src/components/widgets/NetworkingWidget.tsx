import React, { useState, useEffect } from 'react';
import { Wifi, Server, Globe, ArrowDown, ArrowUp, Loader, MapPin, Signal, WifiOff, Zap } from 'lucide-react';
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
import LoadingSpinner from '../LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const formatSpeedInBits = (bytesPerSecond) => {
  if (!bytesPerSecond || bytesPerSecond < 0) bytesPerSecond = 0;
  const bitsPerSecond = bytesPerSecond * 8;
  const k = 1000;
  if (bitsPerSecond < k) return `${bitsPerSecond.toFixed(0)} bps`;
  if (bitsPerSecond < k * k) return `${(bitsPerSecond / k).toFixed(2)} Kbps`;
  if (bitsPerSecond < k * k * k) return `${(bitsPerSecond / (k * k)).toFixed(2)} Mbps`;
  return `${(bitsPerSecond / (k * k * k)).toFixed(2)} Gbps`;
};

const MAX_DATA_POINTS = 20;

const NetworkingWidgetSkeleton = () => {
  const skeletonBase = "bg-gray-700/50 rounded animate-pulse";
  return (
    <div className="h-full flex flex-col justify-between">
      <div className="h-24 mb-4 bg-gray-800 rounded-lg animate-pulse"></div>
      <div className="flex justify-between items-center text-sm mb-4">
        <div className="flex items-center gap-2">
          <div className={`${skeletonBase} h-4 w-4`}></div>
          <div className={`${skeletonBase} h-4 w-20`}></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${skeletonBase} h-4 w-4`}></div>
          <div className={`${skeletonBase} h-4 w-20`}></div>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm text-gray-400">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className={`${skeletonBase} h-4 w-4`}></div>
              <div className={`${skeletonBase} h-4 w-16`}></div>
            </div>
            <div className={`${skeletonBase} h-4 w-24`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
          const newUpload = [...prev.upload.slice(1), (res.data.upload_speed * 8) / 1000000]; // in Mbps
          const newDownload = [...prev.download.slice(1), (res.data.download_speed * 8) / 1000000]; // in Mbps
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
          callback: (value) => `${value.toFixed(1)} Mbps`,
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`,
        },
      },
    },
  };

  const renderContent = () => {
    if (isLoading) {
      return <NetworkingWidgetSkeleton />;
    }
    if (!stats) {
      return <div className="flex-grow flex items-center justify-center text-sm text-gray-500">Could not load network data.</div>;
    }

    // Display prominent "No internet connection" if offline
    if (!stats.online_status) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          <WifiOff size={48} className="mb-4" />
          <p className="font-bold text-lg">No Internet Connection</p>
          <p className="text-sm text-gray-400 mt-2">
            You are currently offline. Local network services may still be available.
          </p>
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-4 text-xs text-gray-400">
              <p className="font-semibold">Details:</p>
              {stats.errors.map((err, index) => (
                <p key={index}>{err}</p>
              ))}
            </div>
          )}
          {/* Still display local network info if available */}
          <div className="flex flex-col gap-2 text-sm text-gray-400 mt-4 w-full max-w-xs">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                {stats.connection_type === 'wifi' && <Wifi size={16} />}
                {stats.connection_type === 'lan' && <Server size={16} />}
                <span className="capitalize">{stats.connection_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff size={16} className="text-red-500" />
                <span className="text-red-400">Offline</span>
              </div>
            </div>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Server size={16} />
                <span>Local IP:</span>
              </div>
              <span>{stats.local_ip}</span>
            </div>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Gateway:</span>
              </div>
              <span>{stats.gateway}</span>
            </div>
          </div>
        </div>
      );
    }

    // Display detailed errors if present (when online but other issues)
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
        <div className="flex justify-between items-center text-sm mb-4">
          <div className="flex items-center gap-2 text-blue-400">
            <ArrowDown size={16} />
            <span>{formatSpeedInBits(stats.download_speed)}</span>
          </div>
          <div className="flex items-center gap-2 text-green-400">
            <ArrowUp size={16} />
            <span>{formatSpeedInBits(stats.upload_speed)}</span>
          </div>
        </div>
        {/* Simplified network details */}
        <div className="flex flex-col gap-2 text-sm text-gray-400">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Globe size={16} />
              <span>IP:</span>
            </div>
            <span>{stats.public_ip}</span>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              {stats.connection_type === 'wifi' && <Wifi size={16} />}
              {stats.connection_type === 'lan' && <Server size={16} />}
              <span className="capitalize">{stats.connection_type}</span>
            </div>
            <div className="flex items-center gap-2">
              {stats.online_status ? <Signal size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-400" />}
              <span className={stats.online_status ? "text-green-400" : "text-red-400"}>{stats.online_status ? "Online" : "Offline"}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-purple-400" />
              <span>Latency:</span>
            </div>
            <span>{typeof stats.ping_latency === 'number' ? `${stats.ping_latency.toFixed(1)} ms` : stats.ping_latency}</span>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Loss:</span>
            </div>
            <span>{typeof stats.packet_loss === 'number' ? `${stats.packet_loss.toFixed(0)}%` : stats.packet_loss}</span>
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