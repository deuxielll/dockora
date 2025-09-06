import React from 'react';
import { Eye, Share2, Copy, Edit, Trash2, RotateCcw, Users, Download, ClipboardPaste } from 'lucide-react';

const ItemContextMenu = ({
  contextMenu,
  isTrashView,
  isSharedWithMeView,
  isMySharesView, // New prop
  selectedCount,
  singleSelectedItem,
  onView,
  onSharePublic, // For public links
  onShareWithUsers, // For user-to-user sharing
  onCopyPath,
  onRename,
  onDelete,
  onRestore,
  onClose,
  onDownloadShared,
  onCopy, // New prop
  onPaste, // New prop
  hasCopiedItems, // New prop
}) => {
  if (!contextMenu || selectedCount === 0) return null;

  const canPaste = hasCopiedItems && !isTrashView && !isSharedWithMeView && !isMySharesView;

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
      ) : isSharedWithMeView ? (
        <ul className="space-y-1">
          {singleSelectedItem && singleSelectedItem.type === 'file' && (
            <li><button onClick={() => { onView(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Eye size={16} /><span>View</span></button></li>
          )}
          {singleSelectedItem && (
            <li><button onClick={() => { onDownloadShared(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Download size={16} /><span>Download</span></button></li>
          )}
          <li><button onClick={() => { onCopyPath(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Copy size={16} /><span>Copy Path(s)</span></button></li>
          <li><button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={16} /><span>Remove from list ({selectedCount})</span></button></li>
        </ul>
      ) : isMySharesView ? ( // New context menu for My Shares
        <ul className="space-y-1">
          <li><button onClick={() => { onCopyPath(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Copy size={16} /><span>Copy Path(s)</span></button></li>
          <li><button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md"><Trash2 size={16} /><span>Unshare ({selectedCount})</span></button></li>
        </ul>
      ) : (
        <ul className="space-y-1">
          {singleSelectedItem && singleSelectedItem.type === 'file' && (
            <li><button onClick={() => { onView(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Eye size={16} /><span>View</span></button></li>
          )}
          {selectedCount > 0 && (
            <li><button onClick={() => { onSharePublic(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Share2 size={16} /><span>Share Public ({selectedCount})</span></button></li>
          )}
          {selectedCount > 0 && (
            <li><button onClick={() => { onShareWithUsers(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Users size={16} /><span>Share with Users ({selectedCount})</span></button></li>
          )}
          <li><button onClick={() => { onCopy(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Copy size={16} /><span>Copy ({selectedCount})</span></button></li>
          <li><button onClick={() => { onCopyPath(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><Copy size={16} /><span>Copy Path(s)</span></button></li>
          {canPaste && (
            <li><button onClick={() => { onPaste(); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-blue-500/10 rounded-md"><ClipboardPaste size={16} /><span>Paste ({hasCopiedItems ? 'items' : ''})</span></button></li>
          )}
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