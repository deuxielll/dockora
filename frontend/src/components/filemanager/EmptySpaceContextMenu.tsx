import React from 'react';
import { FilePlus, FolderPlus } from 'lucide-react';

const EmptySpaceContextMenu = ({ contextMenu, onCreateFile, onCreateFolder, onClose }) => {
  if (!contextMenu) return null;

  return (
    <div
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="absolute z-50 bg-dark-bg shadow-neo rounded-lg p-2"
    >
      <ul className="space-y-1">
        <li>
          <button onClick={() => { onCreateFile(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
            <FilePlus size={16} />
            <span>New File</span>
          </button>
        </li>
        <li>
          <button onClick={() => { onCreateFolder(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md">
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default EmptySpaceContextMenu;