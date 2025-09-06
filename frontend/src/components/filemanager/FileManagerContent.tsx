"use client";

import React, { useRef } from 'react';
import Breadcrumbs from './Breadcrumbs';
import FileManagerActions from './FileManagerActions';
import FileTable from './FileTable';
import MySharesView from './MySharesView';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react'; // Import Search icon

const FileManagerContent = ({
  currentUser,
  currentPath,
  setCurrentPath,
  items,
  isLoading,
  error,
  selectedItems,
  setSelectedItems, // New prop
  draggedOverItem,
  isDragging,
  copiedItems,
  cutItems,
  fileInputRef,
  isTrashView,
  isSharedWithMeView,
  isMySharesView,
  selectedCount,
  singleSelectedItem,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
  onUploadClick,
  onCreateFile,
  onCreateFolder,
  onGoUp,
  onDownloadShared,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  onDragStart,
  onItemDragEnter,
  onItemDragLeave,
  onDropOnItem,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRefreshMyShares,
  searchTerm, // New prop
  setSearchTerm, // New prop
  sortColumn, // New prop
  sortDirection, // New prop
  onSort, // New prop
}) => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";

  return (
    <div
      className={`p-6 rounded-xl ${panelClasses} relative flex-1 flex flex-col overflow-hidden`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex items-center justify-center z-10 pointer-events-none shadow-neo">
          <p className="text-lg font-semibold text-white">Drop files to upload</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 flex-shrink-0">
        <div className="flex-grow">
          <Breadcrumbs
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            isTrashView={isTrashView}
            isSharedWithMeView={isSharedWithMeView}
            isMySharesView={isMySharesView}
          />
          {selectedCount > 0 && <p className="text-sm text-gray-200 mt-1">{selectedCount} item(s) selected</p>}
        </div>
        {!isMySharesView && ( // Hide FileManagerActions for MySharesView
          <FileManagerActions
            isTrashView={isTrashView}
            isSharedWithMeView={isSharedWithMeView}
            selectedCount={selectedCount}
            itemCount={items.length}
            currentPath={currentPath}
            onRestore={onRestore}
            onDeletePermanently={onDeletePermanently}
            onEmptyTrash={onEmptyTrash}
            onUploadClick={onUploadClick}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onGoUp={onGoUp}
            onDownloadShared={onDownloadShared}
            singleSelectedItem={singleSelectedItem}
          />
        )}
        <input type="file" multiple ref={fileInputRef} onChange={(e) => onUploadClick(e.target.files)} className="hidden" />
      </div>

      {/* Search Input */}
      {!isTrashView && !isSharedWithMeView && !isMySharesView && (
        <div className="relative mb-4 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" size={20} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputStyles} pl-10`}
          />
        </div>
      )}

      <div className="overflow-y-auto flex-grow no-scrollbar" onClick={(e) => e.stopPropagation()}>
        {isMySharesView ? (
          <MySharesView 
            items={items} // Pass items from FileManagerPage
            isLoading={isLoading} // Pass isLoading from FileManagerPage
            error={error} // Pass error from FileManagerPage
            selectedItems={selectedItems} 
            setSelectedItems={setSelectedItems}
            onItemClick={onItemClick}
            onItemDoubleClick={onItemDoubleClick}
            onItemContextMenu={onItemContextMenu}
            searchTerm={searchTerm}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
        ) : (
          <FileTable
            items={items}
            isLoading={isLoading}
            error={error}
            isTrashView={isTrashView}
            isSharedWithMeView={isSharedWithMeView}
            selectedItems={selectedItems}
            draggedOverItem={draggedOverItem}
            onItemClick={onItemClick}
            onItemDoubleClick={onItemDoubleClick}
            onItemContextMenu={onItemContextMenu}
            onDragStart={onDragStart}
            onItemDragEnter={onItemDragEnter}
            onItemDragLeave={onItemDragLeave}
            onDropOnItem={onDropOnItem}
            searchTerm={searchTerm} // Pass search term
            sortColumn={sortColumn} // Pass sort column
            sortDirection={sortDirection} // Pass sort direction
            onSort={onSort} // Pass sort handler
          />
        )}
      </div>
    </div>
  );
};

export default FileManagerContent;