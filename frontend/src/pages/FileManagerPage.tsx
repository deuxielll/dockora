"use client";

import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import FileManagerContent from '../components/filemanager/FileManagerContent';
import FileManagerModals from '../components/filemanager/FileManagerModals';
import FileManagerContextMenus from '../components/filemanager/FileManagerContextMenus';
import useFileManager from '../hooks/useFileManager'; // New import
import useFileManagerModals from '../hooks/useFileManagerModals'; // New import
import useFileManagerContextMenus from '../hooks/useFileManagerContextMenus'; // New import

const FileManagerPage = () => {
  const { currentUser } = useAuth();

  // Use custom hooks for all file manager logic, modals, and context menus
  const fileManager = useFileManager();
  const fileManagerModals = useFileManagerModals();
  const fileManagerContextMenus = useFileManagerContextMenus();

  // Effect for global keyboard shortcuts (e.g., Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allItemIdentifiers = new Set(fileManager.items.map(item => fileManager.getItemIdentifier(item)));
        fileManager.setSelectedItems(allItemIdentifiers);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fileManager.items, fileManager.getItemIdentifier, fileManager.setSelectedItems]);

  return (
    <>
      <div className="flex h-full p-4 sm:p-6 pb-28">
        <Sidebar onNavigate={fileManager.setCurrentPath} currentUser={currentUser} />
        <div className="flex-1 flex flex-col overflow-hidden ml-6">
          <h2 className="text-2xl font-bold text-gray-200 mb-6">File Manager</h2>
          <FileManagerContent
            currentUser={currentUser}
            fileInputRef={fileManager.fileInputRef}
            // Props from useFileManager
            currentPath={fileManager.currentPath}
            setCurrentPath={fileManager.setCurrentPath}
            items={fileManager.items}
            isLoading={fileManager.isLoading}
            error={fileManager.error}
            selectedItems={fileManager.selectedItems}
            draggedOverItem={fileManager.draggedOverItem}
            isDragging={fileManager.isDragging}
            copiedItems={fileManager.copiedItems}
            cutItems={fileManager.cutItems}
            isTrashView={fileManager.isTrashView}
            isSharedWithMeView={fileManager.isSharedWithMeView}
            isMySharesView={fileManager.isMySharesView}
            selectedCount={fileManagerContextMenus.selectedCount} // Use context menu's selectedCount
            singleSelectedItem={fileManagerContextMenus.singleSelectedItem} // Use context menu's singleSelectedItem
            searchTerm={fileManager.searchTerm}
            setSearchTerm={fileManager.setSearchTerm}
            sortColumn={fileManager.sortColumn}
            sortDirection={fileManager.sortDirection}
            onSort={fileManager.handleSort}
            // Action handlers from useFileManager
            onRestore={fileManager.handleRestoreMultiple}
            onDeletePermanently={fileManager.handleDeleteMultiple}
            onEmptyTrash={fileManager.handleEmptyTrash}
            onUploadClick={(files) => fileManager.fileInputRef.current.files = files} // Direct file input access
            onCreateFile={() => fileManagerModals.setShowCreateModal({ type: 'file' })}
            onCreateFolder={() => fileManagerModals.setShowCreateModal({ type: 'dir' })}
            onGoUp={fileManager.goUp}
            onDownloadShared={fileManager.handleDownloadSharedFile}
            onItemClick={fileManager.handleItemClick}
            onItemDoubleClick={(item) => {
              if (item.type === 'dir') {
                fileManager.handleItemDoubleClick(item);
              } else {
                fileManagerModals.setViewingFile(item); // Use modal hook for viewing files
              }
            }}
            onItemContextMenu={fileManagerContextMenus.handleItemContextMenu}
            onDragStart={fileManager.handleDragStart}
            onItemDragEnter={fileManager.onItemDragEnter}
            onItemDragLeave={fileManager.onItemDragLeave}
            onDropOnItem={fileManager.handleDropOnItem}
            onDragOver={fileManager.handleDragOver}
            onDragLeave={fileManager.handleDragLeave}
            onDrop={fileManager.handleDrop}
            onDragEnd={fileManager.handleDragEnd}
            onRefreshMyShares={() => fileManager.fetchItems(fileManager.currentPath)}
          />
        </div>
      </div>
      <FileManagerModals
        // Props from useFileManagerModals
        viewingFile={fileManagerModals.viewingFile}
        setViewingFile={fileManagerModals.setViewingFile}
        showCreateModal={fileManagerModals.showCreateModal}
        setShowCreateModal={fileManagerModals.setShowCreateModal}
        itemToRename={fileManagerModals.itemToRename}
        setItemToRename={fileManagerModals.setItemToRename}
        itemsToSharePublic={fileManagerModals.itemsToSharePublic}
        setItemsToSharePublic={fileManagerModals.setItemsToSharePublic}
        itemsToShareWithUsers={fileManagerModals.itemsToShareWithUsers}
        setItemsToShareWithUsers={fileManagerModals.setItemsToShareWithUsers}
        itemsToMove={fileManagerModals.itemsToMove}
        setItemsToMove={fileManagerModals.setItemsToMove}
        // Handlers from useFileManagerModals
        onCreate={fileManagerModals.handleCreateItem}
        onRename={fileManagerModals.handleRenameItem}
        onMove={fileManagerModals.handleMoveItems}
        onShareWithUsersSuccess={fileManagerModals.onShareWithUsersSuccess}
      />
      <FileManagerContextMenus
        // Props from useFileManagerContextMenus
        contextMenu={fileManagerContextMenus.contextMenu}
        emptySpaceContextMenu={fileManagerContextMenus.emptySpaceContextMenu}
        closeAllContextMenus={fileManagerContextMenus.closeAllContextMenus}
        isTrashView={fileManagerContextMenus.isTrashView}
        isSharedWithMeView={fileManagerContextMenus.isSharedWithMeView}
        isMySharesView={fileManagerContextMenus.isMySharesView}
        selectedCount={fileManagerContextMenus.selectedCount}
        singleSelectedItem={fileManagerContextMenus.singleSelectedItem}
        hasCopiedItems={fileManagerContextMenus.hasCopiedItems}
        hasCutItems={fileManagerContextMenus.hasCutItems}
        // Action handlers from useFileManagerContextMenus
        onView={fileManagerContextMenus.onView}
        onSharePublic={fileManagerContextMenus.onSharePublic}
        onShareWithUsers={fileManagerContextMenus.onShareWithUsers}
        onCopyPath={fileManagerContextMenus.onCopyPath}
        onRename={fileManagerContextMenus.onRename}
        onDelete={fileManagerContextMenus.onDelete}
        onRestore={fileManagerContextMenus.onRestore}
        onDownloadShared={fileManagerContextMenus.onDownloadShared}
        onCopy={fileManagerContextMenus.onCopy}
        onCut={fileManagerContextMenus.onCut}
        onPaste={fileManagerContextMenus.onPaste}
        onMove={fileManagerContextMenus.onMove}
        onCreateFile={fileManagerContextMenus.onCreateFile}
        onCreateFolder={fileManagerContextMenus.onCreateFolder}
      />
    </>
  );
};

export default FileManagerPage;