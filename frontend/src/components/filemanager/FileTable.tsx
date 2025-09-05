import React from 'react';
import { Folder, FileText, Trash2, Users } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

const FileTable = ({
  items,
  isLoading,
  error,
  isTrashView,
  isSharedWithMeView,
  selectedItems,
  draggedOverItem,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  onDragStart,
  onItemDragEnter,
  onItemDragLeave,
  onDropOnItem,
}) => {
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleString();
  
  const getItemIdentifier = (item) => {
    if (isTrashView) return item.trashed_name;
    if (isSharedWithMeView) return item.id;
    return item.path;
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (items.length === 0) {
    let message = 'This directory is empty.';
    let Icon = Folder;
    if (isTrashView) {
        message = 'Your trash is empty.';
        Icon = Trash2;
    } else if (isSharedWithMeView) {
        message = 'No files or folders have been shared with you.';
        Icon = Users;
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <Icon size={48} className="mb-4" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <table className="w-full text-left select-none">
      <thead>
        <tr className="border-b border-gray-700/50">
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">Name</th>
          {isTrashView && <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden lg:table-cell">Original Location</th>}
          {isSharedWithMeView && <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden lg:table-cell">Shared By</th>}
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden md:table-cell">Size</th>
          <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden sm:table-cell">{isTrashView ? 'Date Deleted' : isSharedWithMeView ? 'Date Shared' : 'Last Modified'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={getItemIdentifier(item)}
            draggable={!isTrashView && !isSharedWithMeView}
            onDragStart={(e) => onItemDragStart(e, item)}
            onDragEnter={(e) => onItemDragEnter(e, item)}
            onDragLeave={onItemDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropOnItem(e, item)}
            onClick={(e) => onItemClick(item, e)}
            onDoubleClick={() => onItemDoubleClick(item)}
            onContextMenu={(e) => onItemContextMenu(e, item)}
            className={`transition-colors duration-200 cursor-pointer ${selectedItems.has(getItemIdentifier(item)) ? 'shadow-neo-inset bg-blue-500/10' : 'hover:shadow-neo-inset'} ${draggedOverItem === getItemIdentifier(item) ? 'shadow-neo-inset' : ''}`}
          >
            <td className="p-4 flex items-center gap-3">
              {item.type === 'dir' ? <Folder size={20} className="text-blue-400" /> : <FileText size={20} className="text-gray-400" />}
              <span className="font-medium text-gray-200 truncate">{item.name}</span>
              {item.is_shared && !isTrashView && !isSharedWithMeView && (
                <span className="w-2 h-2 bg-accent rounded-full ml-2" title="Shared"></span>
              )}
            </td>
            {isTrashView && <td className="p-4 text-sm hidden lg:table-cell truncate text-gray-300" title={item.original_path}>{item.original_path}</td>}
            {isSharedWithMeView && <td className="p-4 text-sm hidden lg:table-cell truncate text-gray-300" title={item.sharer_name}>{item.sharer_name}</td>}
            <td className="p-4 text-sm hidden md:table-cell text-gray-300">{item.type === 'file' ? formatSize(item.size) : '-'}</td>
            <td className="p-4 text-sm hidden sm:table-cell text-gray-300">{formatDate(isTrashView ? item.deleted_at : isSharedWithMeView ? item.shared_at : item.modified_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FileTable;