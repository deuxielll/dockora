import React from 'react';
import { Eye, Share2, Copy, Edit, Trash2, RotateCcw } from 'lucide-react';

const ItemContextMenu = ({
  contextMenu,
  isTrashView,
  selectedCount,
  singleSelectedItem,
  onView,
  onShare,
  onCopyPath,
  onRename,
  onDelete,
  onRestore,
  onClose,
}) => {
  if (!contextMenu || selectedCount === 0) return null;

  return (
    <div
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="absolute z-50 bg-dark-bg shadow-neo rounded-lg p-2"
    >
      {isTrashView ? (
        <ul className="space-y-1">
          <li><button onClick={() => { onRestore(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><RotateCcw size={16} /><span>Restore ({selectedCount})</span></button></li>
          <li><button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={16} /><span>Delete Permanently ({selectedCount})</span></button></li>
        </ul>
      ) : (
        <ul className="space-y-1">
          {singleSelectedItem && singleSelectedItem.type === 'file' && (
            <li><button onClick={() => { onView(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Eye size={16} /><span>View</span></button></li>
          )}
          {selectedCount > 0 && (
            <li><button onClick={() => { onShare(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Share2 size={16} /><span>Share ({selectedCount})</span></button></li>
          )}
          <li><button onClick={() => { onCopyPath(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Copy size={16} /><span>Copy Path(s)</span></button></li>
          {singleSelectedItem && (
            <li><button onClick={() => { onRename(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Edit size={16} /><span>Rename</span></button></li>
          )}
          <li><button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={16} /><span>Delete ({selectedCount})</span></button></li>
        </ul>
      )}
    </div>
  );
};

export default ItemContextMenu;