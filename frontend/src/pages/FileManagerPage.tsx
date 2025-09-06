"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { browseFiles, createItem, uploadFile, deleteItem, renameItem, moveItems, getTrashItems, restoreTrashItems, deleteTrashItemsPermanently, emptyTrash, getSharedWithMeItems, downloadSharedWithMeFile, unshareFileWithUsers, updateLastViewedSharedFilesTimestamp, copyItems, getSharedByMeItems, shareFileWithAdmin } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import FileManagerContent from '../components/filemanager/FileManagerContent';
import FileManagerModals from '../components/filemanager/FileManagerModals';
import FileManagerContextMenus from '../components/filemanager/FileManagerContextMenus';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const FileManagerPage = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.state?.path || '/');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null);
  const [itemToRename, setItemToRename] = useState(null);
  const [itemsToSharePublic, setItemsToSharePublic] = useState(null);
  const [itemsToShareWithUsers, setItemsToShareWithUsers] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [emptySpaceContextMenu, setEmptySpaceContextMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [draggedOverItem, setDraggedOverItem] = useState(null);
  const [copiedItems, setCopiedItems] = useState([]);
  const [cutItems, setCutItems] = useState([]);
  const fileInputRef = useRef(null);

  // New states for search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // New state for MoveItemModal
  const [itemsToMove, setItemsToMove] = useState(null);

  const isTrashView = currentPath === 'trash';
  const isSharedWithMeView = currentPath === 'shared-with-me';
  const isMySharesView = currentPath === 'my-shares';

  const fetchItems = useCallback(async (path) => {
    setIsLoading(true);
    setError('');
    try {
      let res;
      if (path === 'trash') {
        res = await getTrashItems();
      } else if (path === 'shared-with-me') {
        res = await getSharedWithMeItems();
        await updateLastViewedSharedFilesTimestamp();
      } else if (path === 'my-shares') {
        res = await getSharedByMeItems(); // MySharesView now fetches its own data, but we need to populate `items` for context menu logic
      } else {
        res = await browseFiles(path);
      }
      setItems(res.data);
      setSelectedItems(new Set());
      setSearchTerm(''); // Reset search term on path change
      setSortColumn('name'); // Reset sort on path change
      setSortDirection('asc'); // Reset sort on path change
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load directory.');
      if (path !== '/' && path !== 'trash' && path !== 'shared-with-me' && path !== 'my-shares') setCurrentPath('/');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeAllContextMenus = useCallback(() => {
    setContextMenu(null);
    setEmptySpaceContextMenu(null);
  }, []);

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath, fetchItems]);

  useEffect(() => {
    if (location.state?.path && location.state.path !== currentPath) {
      setCurrentPath(location.state.path);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state?.path, currentPath]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allItemIdentifiers = new Set(items.map(item => getItemIdentifier(item)));
        setSelectedItems(allItemIdentifiers);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', closeAllContextMenus);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', closeAllContextMenus);
    };
  }, [items, closeAllContextMenus]);

  const getItemIdentifier = (item) => {
    if (isTrashView) return item.trashed_name;
    if (isSharedWithMeView) return item.id;
    if (isMySharesView) return item.id;
    return item.path;
  };

  const handleItemDoubleClick = async (item) => {
    if (item.type === 'dir') {
      if (isSharedWithMeView || isMySharesView) {
        toast.error("Cannot browse subfolders directly in this view. Please download or view the item.");
        return;
      }
      setCurrentPath(item.path);
    } else {
      setViewingFile(item);
    }
  };

  const handleItemClick = (item, e) => {
    e.stopPropagation();
    const itemIdentifier = getItemIdentifier(item);

    if (e.shiftKey && selectionAnchor) {
      const anchorIndex = items.findIndex(i => getItemIdentifier(i) === getItemIdentifier(selectionAnchor));
      const currentIndex = items.findIndex(i => getItemIdentifier(i) === itemIdentifier);
      const start = Math.min(anchorIndex, currentIndex);
      const end = Math.max(anchorIndex, currentIndex);
      const newSelectedItems = e.ctrlKey ? new Set(selectedItems) : new Set();
      for (let i = start; i <= end; i++) newSelectedItems.add(getItemIdentifier(items[i]));
      setSelectedItems(newSelectedItems);
    } else if (e.ctrlKey) {
      const newSelectedItems = new Set(selectedItems);
      if (newSelectedItems.has(itemIdentifier)) newSelectedItems.delete(itemIdentifier);
      else newSelectedItems.add(itemIdentifier);
      setSelectedItems(newSelectedItems);
      setSelectionAnchor(item);
    } else {
      setSelectedItems(new Set([itemIdentifier]));
      setSelectionAnchor(item);
      setCopiedItems([]);
      setCutItems([]);
    }
  };

  const goUp = () => {
    if (currentPath !== '/') setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/');
  };

  const handleCreate = async (name) => {
    try {
      await createItem({ path: currentPath, name, type: showCreateModal.type });
      toast.success(`'${name}' created successfully.`);
      setShowCreateModal(null);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to create ${showCreateModal.type}.`);
    }
  };

  const handleUpload = async (files) => {
    const uploadPromises = Array.from(files).map(file => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);
      return uploadFile(formData);
    });

    const uploadPromise = Promise.all(uploadPromises);
    toast.promise(uploadPromise, {
      loading: `Uploading ${files.length} file(s)...`,
      success: () => {
        fetchItems(currentPath);
        return `${files.length} file(s) uploaded successfully!`;
      },
      error: 'An error occurred during upload.',
    });
  };

  const handleDeleteMultiple = async () => {
    const itemsToDelete = Array.from(selectedItems);
    if (itemsToDelete.length === 0) return;

    if (isSharedWithMeView || isMySharesView) {
      const confirmMessage = isSharedWithMeView
        ? `Are you sure you want to remove ${itemsToDelete.length} item(s) from your 'Shared with me' list? This will not delete the original files.`
        : `Are you sure you want to unshare ${itemsToDelete.length} item(s)? This will revoke access for the recipients.`;

      if (window.confirm(confirmMessage)) {
        try {
          await unshareFileWithUsers(itemsToDelete);
          toast.success(`${itemsToDelete.length} item(s) removed/unshared successfully.`);
          fetchItems(currentPath);
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to remove/unshare item(s).');
        }
      }
      return;
    }

    const confirmMessage = isTrashView
      ? `Are you sure you want to permanently delete ${itemsToDelete.length} item(s)? This action cannot be undone.`
      : `Are you sure you want to move ${itemsToDelete.length} item(s) to the trash?`;

    if (window.confirm(confirmMessage)) {
      try {
        if (isTrashView) await deleteTrashItemsPermanently(itemsToDelete);
        else await deleteItem(itemsToDelete);
        toast.success(`${itemsToDelete.length} item(s) deleted.`);
        fetchItems(currentPath);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to complete the delete operation.');
      }
    }
  };

  const handleRestoreMultiple = async () => {
    const itemsToRestore = Array.from(selectedItems);
    if (itemsToRestore.length === 0) return;
    try {
      await restoreTrashItems(itemsToRestore);
      toast.success(`${itemsToRestore.length} item(s) restored.`);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore one or more items.');
    }
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently empty the trash? This action cannot be undone.')) {
      try {
        await emptyTrash();
        toast.success('Trash has been emptied.');
        fetchItems(currentPath);
      } catch (err) {
        toast.error('Failed to empty trash.');
      }
    }
  };

  const handleRename = async (newName) => {
    try {
      await renameItem(itemToRename.path, newName);
      toast.success(`Renamed to '${newName}'.`);
      setItemToRename(null);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rename item.');
    }
  };

  const handleCopyMultiplePaths = () => {
    const pathsToCopy = Array.from(selectedItems).map(id => {
      const item = items.find(i => getItemIdentifier(i) === id);
      if (isSharedWithMeView) return `${item.sharer_name}:${item.path}`;
      if (isMySharesView) {
        // For MySharesView, the 'path' is relative to the sharer, so we show sharer:path
        const sharedItem = items.find(i => i.id === id);
        return sharedItem ? `${sharedItem.sharer_name}:${sharedItem.path}` : '';
      }
      return item.path;
    }).filter(Boolean); // Filter out any empty strings from items not found
    navigator.clipboard.writeText(pathsToCopy.join('\n'))
      .then(() => toast.success('Path(s) copied to clipboard.'))
      .catch(() => toast.error('Failed to copy paths.'));
  };

  const handleCopy = () => {
    const pathsToCopy = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path);
    setCopiedItems(pathsToCopy);
    setCutItems([]);
    toast.success(`${pathsToCopy.length} item(s) copied.`);
  };

  const handleCut = () => {
    const pathsToCut = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path);
    setCutItems(pathsToCut);
    setCopiedItems([]);
    toast.success(`${pathsToCut.length} item(s) cut.`);
  };

  const handlePaste = async () => {
    if (copiedItems.length === 0 && cutItems.length === 0) return;
    if (isTrashView || isSharedWithMeView || isMySharesView) {
      toast.error("Cannot paste into this view.");
      return;
    }

    try {
      if (cutItems.length > 0) {
        await moveItems(cutItems, currentPath);
        toast.success(`${cutItems.length} item(s) moved successfully.`);
        setCutItems([]);
      } else if (copiedItems.length > 0) {
        await copyItems(copiedItems, currentPath);
        toast.success(`${copiedItems.length} item(s) pasted successfully.`);
        setCopiedItems([]);
      }
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to paste item(s).');
    }
  };

  const handleMove = async (itemsToMovePaths, destinationPath) => {
    try {
      await moveItems(itemsToMovePaths, destinationPath);
      toast.success(`${itemsToMovePaths.length} item(s) moved successfully.`);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to move item(s).');
    } finally {
      setItemsToMove(null);
    }
  };

  const handleShareWithAdmin = async () => {
    const pathsToShare = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path);
    if (pathsToShare.length === 0) return;

    try {
      const res = await shareFileWithAdmin(pathsToShare);
      toast.success(res.data.message || `${pathsToShare.length} item(s) shared with admin(s).`);
      setSelectedItems(new Set()); // Clear selection after sharing
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to share with admin(s).');
    }
  };

  const handleContextMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    closeAllContextMenus();
    const itemIdentifier = getItemIdentifier(item);
    if (!selectedItems.has(itemIdentifier)) {
      setSelectedItems(new Set([itemIdentifier]));
      setSelectionAnchor(item);
    }
    setContextMenu({ x: event.pageX, y: event.pageY });
  };

  const handleEmptySpaceContextMenu = (event) => {
    event.preventDefault();
    closeAllContextMenus();
    setSelectedItems(new Set());
    if (!isTrashView && !isSharedWithMeView && !isMySharesView) setEmptySpaceContextMenu({ x: event.pageX, y: event.pageY });
  };

  const handleDragStart = (e, item) => {
    e.stopPropagation();
    if (isTrashView || isSharedWithMeView || isMySharesView) {
      e.preventDefault();
      return;
    }

    const itemIdentifier = getItemIdentifier(item);
    let itemsToDrag = [];

    // If the dragged item is already part of the selection, drag all selected items.
    // Otherwise, just drag the single item.
    if (selectedItems.has(itemIdentifier)) {
      itemsToDrag = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id));
    } else {
      itemsToDrag = [item];
      setSelectedItems(new Set([itemIdentifier])); // Select the dragged item if not already selected
    }
    
    const draggedPaths = itemsToDrag.map(i => i.path);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(draggedPaths));

    const dragPreview = document.createElement('div');
    dragPreview.id = 'drag-preview';
    const iconHTML = itemsToDrag[0].type === 'dir'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    
    const previewText = itemsToDrag.length > 1 ? `${itemsToDrag.length} items` : itemsToDrag[0].name;
    dragPreview.innerHTML = `${iconHTML}<span>${previewText}</span>`;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 10, 10);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
    document.body.classList.add('grabbing');
  };

  const handleDropOnItem = async (e, dropTargetItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverItem(null);
    if (dropTargetItem.type !== 'dir' || isTrashView || isSharedWithMeView || isMySharesView) return;
    const draggedItemsJSON = e.dataTransfer.getData('application/json');
    if (!draggedItemsJSON) return;
    try {
      const sourcePaths = JSON.parse(draggedItemsJSON);
      if (sourcePaths.includes(dropTargetItem.path)) return;
      await moveItems(sourcePaths, dropTargetItem.path);
      toast.success(`${sourcePaths.length} item(s) moved to ${dropTargetItem.name}`);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to move item(s).');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isTrashView && !isSharedWithMeView && !isMySharesView && Array.from(e.dataTransfer.types).includes('Files')) setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggedOverItem(null);
    if (!isTrashView && !isSharedWithMeView && !isMySharesView && e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedOverItem(null);
    document.body.classList.remove('grabbing');
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const selectedCount = selectedItems.size;
  const singleSelectedItem = selectedCount === 1 ? items.find(i => getItemIdentifier(i) === Array.from(selectedItems)[0]) : null;

  const handleViewSharedFile = async (item) => {
    if (item.type === 'dir') {
      toast.error("Cannot view directories directly. Please download.");
      return;
    }
    setViewingFile({
      name: item.name,
      path: item.id,
      type: item.type,
      isShared: true,
      sharer_name: item.sharer_name
    });
  };

  const handleDownloadSharedFile = async (item) => {
    try {
      const response = await downloadSharedWithMeFile(item.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloading ${item.name}...`);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to download ${item.name}.`);
    }
  };

  return (
    <>
      <div className="flex h-full p-4 sm:p-6 pb-28">
        <Sidebar onNavigate={setCurrentPath} currentUser={currentUser} />
        <div className="flex-1 flex flex-col overflow-hidden ml-6">
          <FileManagerContent
            currentUser={currentUser}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            items={items}
            isLoading={isLoading}
            error={error}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            draggedOverItem={draggedOverItem}
            isDragging={isDragging}
            copiedItems={copiedItems}
            cutItems={cutItems}
            fileInputRef={fileInputRef}
            isTrashView={isTrashView}
            isSharedWithMeView={isSharedWithMeView}
            isMySharesView={isMySharesView}
            selectedCount={selectedCount}
            singleSelectedItem={singleSelectedItem}
            onRestore={handleRestoreMultiple}
            onDeletePermanently={handleDeleteMultiple}
            onEmptyTrash={handleEmptyTrash}
            onUploadClick={() => fileInputRef.current.click()}
            onCreateFile={() => setShowCreateModal({ type: 'file' })}
            onCreateFolder={() => setShowCreateModal({ type: 'dir' })}
            onGoUp={goUp}
            onDownloadShared={handleDownloadSharedFile}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onItemContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onItemDragEnter={(e, item) => { e.preventDefault(); e.stopPropagation(); if (item.type === 'dir' && !isTrashView && !isSharedWithMeView && !isMySharesView) setDraggedOverItem(getItemIdentifier(item)); }}
            onItemDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDraggedOverItem(null); }}
            onDropOnItem={handleDropOnItem}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onRefreshMyShares={() => fetchItems(currentPath)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </div>
      <FileManagerModals
        viewingFile={viewingFile}
        setViewingFile={setViewingFile}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        onCreate={handleCreate}
        itemToRename={itemToRename}
        setItemToRename={setItemToRename}
        onRename={handleRename}
        itemsToSharePublic={itemsToSharePublic}
        setItemsToSharePublic={setItemsToSharePublic}
        itemsToShareWithUsers={itemsToShareWithUsers}
        setItemsToShareWithUsers={setItemsToShareWithUsers}
        onShareWithUsersSuccess={() => {
          setItemsToShareWithUsers(null);
          setSelectedItems(new Set());
        }}
        itemsToMove={itemsToMove}
        setItemsToMove={setItemsToMove}
        onMove={handleMove}
      />
      <FileManagerContextMenus
        contextMenu={contextMenu}
        emptySpaceContextMenu={emptySpaceContextMenu}
        closeAllContextMenus={closeAllContextMenus}
        isTrashView={isTrashView}
        isSharedWithMeView={isSharedWithMeView}
        isMySharesView={isMySharesView}
        selectedCount={selectedCount}
        singleSelectedItem={singleSelectedItem}
        onView={() => handleItemDoubleClick(singleSelectedItem)}
        onSharePublic={() => setItemsToSharePublic(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path))}
        onShareWithUsers={() => setItemsToShareWithUsers(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path))}
        onShareWithAdmin={handleShareWithAdmin} // New prop
        onCopyPath={handleCopyMultiplePaths}
        onRename={() => setItemToRename(singleSelectedItem)}
        onDelete={handleDeleteMultiple}
        onRestore={handleRestoreMultiple}
        onDownloadShared={() => handleDownloadSharedFile(singleSelectedItem)}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        hasCopiedItems={copiedItems.length > 0}
        hasCutItems={cutItems.length > 0}
        onCreateFile={() => setShowCreateModal({ type: 'file' })}
        onCreateFolder={() => setShowCreateModal({ type: 'dir' })}
        onMove={() => setItemsToMove(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path))}
      />
    </>
  );
};

export default FileManagerPage;