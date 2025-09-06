"use client";

import { useState, useEffect, useCallback } from 'react';
import { useFileManager } from './useFileManager'; // Import useFileManager to get item data and actions
import { useFileManagerModals } from './useFileManagerModals'; // Import useFileManagerModals for modal actions

const useFileManagerContextMenus = () => {
  const {
    items, selectedItems, setSelectedItems, setSelectionAnchor,
    getItemIdentifier,
    isTrashView, isSharedWithMeView, isMySharesView,
    copiedItems, cutItems,
    handleDeleteMultiple, handleRestoreMultiple,
    handleCopyMultiplePaths, handleCopy, handleCut, handlePaste,
    handleDownloadSharedFile,
  } = useFileManager();

  const {
    setViewingFile, setShowCreateModal, setItemToRename,
    setItemsToSharePublic, setItemsToShareWithUsers, setItemsToMove,
  } = useFileManagerModals();

  const [contextMenu, setContextMenu] = useState(null); // For item-specific context menu
  const [emptySpaceContextMenu, setEmptySpaceContextMenu] = useState(null); // For empty space context menu

  const closeAllContextMenus = useCallback(() => {
    setContextMenu(null);
    setEmptySpaceContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      closeAllContextMenus();
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [closeAllContextMenus]);

  const handleItemContextMenu = useCallback((event, item) => {
    event.preventDefault();
    event.stopPropagation();
    closeAllContextMenus();
    const itemIdentifier = getItemIdentifier(item);
    if (!selectedItems.has(itemIdentifier)) {
      setSelectedItems(new Set([itemIdentifier]));
      setSelectionAnchor(item);
    }
    setContextMenu({ x: event.pageX, y: event.pageY });
  }, [getItemIdentifier, selectedItems, setSelectedItems, setSelectionAnchor, closeAllContextMenus]);

  const handleEmptySpaceContextMenu = useCallback((event) => {
    event.preventDefault();
    closeAllContextMenus();
    setSelectedItems(new Set());
    if (!isTrashView && !isSharedWithMeView && !isMySharesView) {
      setEmptySpaceContextMenu({ x: event.pageX, y: event.pageY });
    }
  }, [closeAllContextMenus, setSelectedItems, isTrashView, isSharedWithMeView, isMySharesView]);

  const selectedCount = selectedItems.size;
  const singleSelectedItem = selectedCount === 1 ? items.find(i => getItemIdentifier(i) === Array.from(selectedItems)[0]) : null;

  // Handlers for context menu actions
  const handleView = useCallback(() => {
    if (singleSelectedItem) {
      setViewingFile(singleSelectedItem);
    }
  }, [singleSelectedItem, setViewingFile]);

  const handleSharePublic = useCallback(() => {
    setItemsToSharePublic(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path));
  }, [selectedItems, items, getItemIdentifier, setItemsToSharePublic]);

  const handleShareWithUsers = useCallback(() => {
    setItemsToShareWithUsers(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path));
  }, [selectedItems, items, getItemIdentifier, setItemsToShareWithUsers]);

  const handleRename = useCallback(() => {
    if (singleSelectedItem) {
      setItemToRename(singleSelectedItem);
    }
  }, [singleSelectedItem, setItemToRename]);

  const handleDelete = useCallback(() => {
    handleDeleteMultiple();
  }, [handleDeleteMultiple]);

  const handleRestore = useCallback(() => {
    handleRestoreMultiple();
  }, [handleRestoreMultiple]);

  const handleDownloadShared = useCallback(() => {
    if (singleSelectedItem) {
      handleDownloadSharedFile(singleSelectedItem);
    }
  }, [singleSelectedItem, handleDownloadSharedFile]);

  const handleCreateFile = useCallback(() => {
    setShowCreateModal({ type: 'file' });
  }, [setShowCreateModal]);

  const handleCreateFolder = useCallback(() => {
    setShowCreateModal({ type: 'dir' });
  }, [setShowCreateModal]);

  const handleMove = useCallback(() => {
    setItemsToMove(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path));
  }, [selectedItems, items, getItemIdentifier, setItemsToMove]);

  return {
    contextMenu, emptySpaceContextMenu, closeAllContextMenus,
    handleItemContextMenu, handleEmptySpaceContextMenu,
    selectedCount, singleSelectedItem,
    isTrashView, isSharedWithMeView, isMySharesView,
    hasCopiedItems: copiedItems.length > 0,
    hasCutItems: cutItems.length > 0,
    // Actions to be passed to context menu components
    onView: handleView,
    onSharePublic: handleSharePublic,
    onShareWithUsers: handleShareWithUsers,
    onCopyPath: handleCopyMultiplePaths,
    onRename: handleRename,
    onDelete: handleDelete,
    onRestore: handleRestore,
    onDownloadShared: handleDownloadShared,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onMove: handleMove,
    onCreateFile: handleCreateFile,
    onCreateFolder: handleCreateFolder,
  };
};

export default useFileManagerContextMenus;