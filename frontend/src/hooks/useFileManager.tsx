"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  browseFiles, createItem, uploadFile, deleteItem, renameItem, moveItems,
  getTrashItems, restoreTrashItems, deleteTrashItemsPermanently, emptyTrash,
  getSharedWithMeItems, downloadSharedWithMeFile, unshareFileWithUsers,
  updateLastViewedSharedFilesTimestamp, copyItems, getSharedByMeItems
} from '../services/api';

export const useFileManager = () => { // Added 'export' here
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.state?.path || '/');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection and Clipboard
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [copiedItems, setCopiedItems] = useState([]);
  const [cutItems, setCutItems] = useState([]);

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverItem, setDraggedOverItem] = useState(null);
  const fileInputRef = useRef(null);

  // Search and Sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const isTrashView = currentPath === 'trash';
  const isSharedWithMeView = currentPath === 'shared-with-me';
  const isMySharesView = currentPath === 'my-shares';

  const getItemIdentifier = useCallback((item) => {
    if (isTrashView) return item.trashed_name;
    if (isSharedWithMeView) return item.id;
    if (isMySharesView) return item.id;
    return item.path;
  }, [isTrashView, isSharedWithMeView, isMySharesView]);

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
        res = await getSharedByMeItems();
      } else {
        res = await browseFiles(path);
      }
      setItems(res.data);
      setSelectedItems(new Set());
      setSearchTerm('');
      setSortColumn('name');
      setSortDirection('asc');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load directory.');
      if (path !== '/' && path !== 'trash' && path !== 'shared-with-me' && path !== 'my-shares') setCurrentPath('/');
    } finally {
      setIsLoading(false);
    }
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

  const handleItemDoubleClick = useCallback(async (item) => {
    if (item.type === 'dir') {
      if (isSharedWithMeView || isMySharesView) {
        toast.error("Cannot browse subfolders directly in this view. Please download or view the item.");
        return;
      }
      setCurrentPath(item.path);
    } else {
      // This will be handled by the modal hook
    }
  }, [isSharedWithMeView, isMySharesView]);

  const handleItemClick = useCallback((item, e) => {
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
  }, [getItemIdentifier, items, selectedItems, selectionAnchor]);

  const goUp = useCallback(() => {
    if (currentPath !== '/') setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/');
  }, [currentPath]);

  const handleCreate = useCallback(async (name, type) => {
    try {
      await createItem({ path: currentPath, name, type });
      toast.success(`'${name}' created successfully.`);
      fetchItems(currentPath);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to create ${type}.`);
      return { success: false, error: err.response?.data?.error || `Failed to create ${type}.` };
    }
  }, [currentPath, fetchItems]);

  const handleUpload = useCallback(async (files) => {
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
  }, [currentPath, fetchItems]);

  const handleDeleteMultiple = useCallback(async (itemsToDelete = Array.from(selectedItems)) => {
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
  }, [selectedItems, isSharedWithMeView, isMySharesView, isTrashView, currentPath, fetchItems]);

  const handleRestoreMultiple = useCallback(async () => {
    const itemsToRestore = Array.from(selectedItems);
    if (itemsToRestore.length === 0) return;
    try {
      await restoreTrashItems(itemsToRestore);
      toast.success(`${itemsToRestore.length} item(s) restored.`);
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore one or more items.');
    }
  }, [selectedItems, currentPath, fetchItems]);

  const handleEmptyTrash = useCallback(async () => {
    if (window.confirm('Are you sure you want to permanently empty the trash? This action cannot be undone.')) {
      try {
        await emptyTrash();
        toast.success('Trash has been emptied.');
        fetchItems(currentPath);
      } catch (err) {
        toast.error('Failed to empty trash.');
      }
    }
  }, [currentPath, fetchItems]);

  const handleRename = useCallback(async (item, newName) => {
    try {
      await renameItem(item.path, newName);
      toast.success(`Renamed to '${newName}'.`);
      fetchItems(currentPath);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rename item.');
      return { success: false, error: err.response?.data?.error || 'Failed to rename item.' };
    }
  }, [currentPath, fetchItems]);

  const handleCopyMultiplePaths = useCallback(() => {
    const pathsToCopy = Array.from(selectedItems).map(id => {
      const item = items.find(i => getItemIdentifier(i) === id);
      if (isSharedWithMeView) return `${item.sharer_name}:${item.path}`;
      if (isMySharesView) return `${item.recipient_name}:${item.path}`;
      return item.path;
    });
    navigator.clipboard.writeText(pathsToCopy.join('\n'))
      .then(() => toast.success('Path(s) copied to clipboard.'))
      .catch(() => toast.error('Failed to copy paths.'));
  }, [selectedItems, items, getItemIdentifier, isSharedWithMeView, isMySharesView]);

  const handleCopy = useCallback(() => {
    const pathsToCopy = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path);
    setCopiedItems(pathsToCopy);
    setCutItems([]);
    toast.success(`${pathsToCopy.length} item(s) copied.`);
  }, [selectedItems, items, getItemIdentifier]);

  const handleCut = useCallback(() => {
    const pathsToCut = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path);
    setCutItems(pathsToCut);
    setCopiedItems([]);
    toast.success(`${pathsToCut.length} item(s) cut.`);
  }, [selectedItems, items, getItemIdentifier]);

  const handlePaste = useCallback(async (destinationPath = currentPath) => {
    if (copiedItems.length === 0 && cutItems.length === 0) return;
    if (isTrashView || isSharedWithMeView || isMySharesView) {
      toast.error("Cannot paste into this view.");
      return;
    }

    try {
      if (cutItems.length > 0) {
        await moveItems(cutItems, destinationPath);
        toast.success(`${cutItems.length} item(s) moved successfully.`);
        setCutItems([]);
      } else if (copiedItems.length > 0) {
        await copyItems(copiedItems, destinationPath);
        toast.success(`${copiedItems.length} item(s) pasted successfully.`);
        setCopiedItems([]);
      }
      fetchItems(currentPath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to paste item(s).');
    }
  }, [copiedItems, cutItems, isTrashView, isSharedWithMeView, isMySharesView, currentPath, fetchItems]);

  const handleMove = useCallback(async (itemsToMovePaths, destinationPath) => {
    try {
      await moveItems(itemsToMovePaths, destinationPath);
      toast.success(`${itemsToMovePaths.length} item(s) moved successfully.`);
      fetchItems(currentPath);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to move item(s).');
      return { success: false, error: err.response?.data?.error || 'Failed to move item(s).' };
    }
  }, [currentPath, fetchItems]);

  const handleDragStart = useCallback((e, item) => {
    e.stopPropagation();
    if (isTrashView || isSharedWithMeView || isMySharesView) {
      e.preventDefault();
      return;
    }

    const itemIdentifier = getItemIdentifier(item);
    let itemsToDrag = [];

    if (selectedItems.has(itemIdentifier)) {
      itemsToDrag = Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id));
    } else {
      itemsToDrag = [item];
      setSelectedItems(new Set([itemIdentifier]));
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
  }, [isTrashView, isSharedWithMeView, isMySharesView, getItemIdentifier, selectedItems, items]);

  const handleDropOnItem = useCallback(async (e, dropTargetItem) => {
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
  }, [isTrashView, isSharedWithMeView, isMySharesView, currentPath, fetchItems]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!isTrashView && !isSharedWithMeView && !isMySharesView && Array.from(e.dataTransfer.types).includes('Files')) setIsDragging(true);
  }, [isTrashView, isSharedWithMeView, isMySharesView]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggedOverItem(null);
    if (!isTrashView && !isSharedWithMeView && !isMySharesView && e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  }, [isTrashView, isSharedWithMeView, isMySharesView, handleUpload]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedOverItem(null);
    document.body.classList.remove('grabbing');
  }, []);

  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const handleViewSharedFile = useCallback(async (item) => {
    if (item.type === 'dir') {
      toast.error("Cannot view directories directly. Please download.");
      return;
    }
    // This will be handled by the modal hook
  }, []);

  const handleDownloadSharedFile = useCallback(async (item) => {
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
  }, []);

  return {
    currentPath, setCurrentPath,
    items, isLoading, error,
    selectedItems, setSelectedItems, selectionAnchor, setSelectionAnchor,
    copiedItems, setCopiedItems, cutItems, setCutItems,
    isDragging, setIsDragging, draggedOverItem, setDraggedOverItem, fileInputRef,
    searchTerm, setSearchTerm, sortColumn, setSortColumn, sortDirection, setSortDirection,
    isTrashView, isSharedWithMeView, isMySharesView,
    getItemIdentifier, fetchItems,
    handleItemDoubleClick, handleItemClick, goUp,
    handleCreate, handleUpload, handleDeleteMultiple, handleRestoreMultiple, handleEmptyTrash,
    handleRename, handleCopyMultiplePaths, handleCopy, handleCut, handlePaste, handleMove,
    handleDragStart, handleDropOnItem, handleDragOver, handleDrop, handleDragEnd,
    handleSort, handleViewSharedFile, handleDownloadSharedFile,
  };
};