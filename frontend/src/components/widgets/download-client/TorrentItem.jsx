import React from 'react';
import { ArrowDown, ArrowUp, Users, Clock, Magnet } from 'lucide-react';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytes) => {
  if (bytes === 0) return '0 B/s';
  return `${formatSize(bytes)}/s`;
};

const formatEta = (seconds) => {
  if (seconds > 86400 * 30) return '∞';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const getStatusInfo = (state) => {
  if (state.includes('downloading')) return { text: 'Downloading', color: 'bg-blue-500' };
  if (state.includes('uploading') || state.includes('seeding')) return { text: 'Seeding', color: 'bg-green-500' };
  if (state.includes('paused')) return { text: 'Paused', color: 'bg-yellow-500' };
  if (state.includes('checking')) return { text: 'Checking', color: 'bg-purple-500' };
  if (state.includes('queued')) return { text: 'Queued', color: 'bg-gray-500' };
  return { text: state, color: 'bg-gray-600' };
};

const TorrentItem = ({ torrent, onContextMenu }) => {
  const { text: statusText, color: statusColor } = getStatusInfo(torrent.state);

  return (
    <div onContextMenu={onContextMenu} className="p-3 rounded-lg bg-dark-bg-secondary shadow-neo-inset cursor-context-menu">
      <div className="flex items-center gap-3 mb-2">
        <Magnet size={16} className="text-gray-400 flex-shrink-0" />
        <p className="text-sm font-semibold truncate text-gray-200" title={torrent.name}>{torrent.name}</p>
      </div>
      
      <div className="w-full bg-dark-bg rounded-full h-2 mb-3 shadow-neo-inset">
        <div
          className={`${statusColor} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${torrent.progress * 100}%` }}
        ></div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-xs text-gray-300">
        <div className="flex items-center gap-1" title="Progress">
          <span>{(torrent.progress * 100).toFixed(1)}%</span>
          <span className="text-gray-400">of {formatSize(torrent.size)}</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${statusColor}`}>
          {statusText}
        </div>
        <div className="flex items-center gap-1 text-green-400" title="Download Speed">
          <ArrowDown size={14} />
          <span>{formatSpeed(torrent.dlspeed)}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-400" title="Upload Speed">
          <ArrowUp size={14} />
          <span>{formatSpeed(torrent.upspeed)}</span>
        </div>
        <div className="flex items-center gap-1" title="Seeds / Peers">
          <Users size={14} />
          <span>{torrent.seeds}/{torrent.peers}</span>
        </div>
        <div className="flex items-center gap-1" title="ETA">
          <Clock size={14} />
          <span>{formatEta(torrent.eta)}</span>
        </div>
      </div>
    </div>
  );
};

export default TorrentItem;