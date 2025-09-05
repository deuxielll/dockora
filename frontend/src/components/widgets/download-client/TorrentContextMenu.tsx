import React from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';

const TorrentContextMenu = ({ x, y, torrent, onAction, onClose }) => {
  const isPaused = torrent.state.includes('paused');

  const handleAction = (action) => {
    onAction(torrent.hash, action);
    onClose();
  };

  return (
    <div
      style={{ top: y, left: x }}
      className="absolute z-50 bg-dark-bg/80 backdrop-blur-sm shadow-neo rounded-lg p-2"
    >
      <ul className="space-y-1">
        <li>
          <button onClick={() => handleAction(isPaused ? 'resume' : 'pause')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </li>
        <li>
          <button onClick={() => handleAction('remove')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md">
            <Trash2 size={16} />
            <span>Remove</span>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default TorrentContextMenu;