import React, { useRef, useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Share2, Play, Pause, Square, Edit, Trash2, Link as LinkIcon } from 'lucide-react';

const AppContextMenu = ({ x, y, item, onShare, onAction, onEdit, onDelete }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    if (menuRef.current) {
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuRef.current;
      
      let newTop = y;
      let newLeft = x;

      if (y + offsetHeight > innerHeight) {
        newTop = y - offsetHeight;
      }
      if (x + offsetWidth > innerWidth) {
        newLeft = x - offsetWidth;
      }
      
      if (newTop < 0) newTop = 0;
      if (newLeft < 0) newLeft = 0;

      setPosition({ top: newTop, left: newLeft });
    }
  }, [x, y]);

  if (!item) return null;

  const isBookmark = item.type === 'bookmark';
  const app = item.app;

  const status = !isBookmark ? app.status.toLowerCase() : '';
  const isRunning = status.includes('running') || status.includes('up');
  const isPaused = status.includes('paused');
  const isStopped = !isRunning && !isPaused;

  const handleAction = (action) => {
    onAction(app.id, action);
  };

  let primaryAction = null;
  if (!isBookmark) {
    if (isRunning) {
      primaryAction = (
        <button onClick={() => handleAction('pause')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
          <Pause size={16} />
          <span>Pause</span>
        </button>
      );
    } else if (isPaused) {
      primaryAction = (
        <button onClick={() => handleAction('unpause')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
          <Play size={16} />
          <span>Resume</span>
        </button>
      );
    } else if (isStopped) {
      primaryAction = (
        <button onClick={() => handleAction('start')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-500 hover:bg-green-500/10 rounded-md">
          <Play size={16} />
          <span>Start</span>
        </button>
      );
    }
  }

  const menuContent = (
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[100] bg-dark-bg shadow-neo rounded-lg p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="space-y-1">
        {isBookmark ? (
          <li>
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
              <LinkIcon size={16} />
              <span>Open in new tab</span>
            </a>
          </li>
        ) : (
          <>
            {primaryAction && <li>{primaryAction}</li>}
            {(isRunning || isPaused) && (
              <li>
                <button onClick={() => handleAction('stop')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md">
                  <Square size={16} />
                  <span>Stop</span>
                </button>
              </li>
            )}
            <li>
              <button onClick={onShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
                <Share2 size={16} />
                <span>Share...</span>
              </button>
            </li>
          </>
        )}
        <li>
          <button onClick={onEdit} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
            <Edit size={16} />
            <span>Edit</span>
          </button>
        </li>
        <li>
          <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md">
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </li>
      </ul>
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
};

export default AppContextMenu;