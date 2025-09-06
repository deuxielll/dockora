"use client";

import { useState, useCallback } from 'react';
import { useFileManager } from './useFileManager'; // Import useFileManager to get item data

export const useFileManagerModals = () => { // Added 'export' here
  const { items, getItemIdentifier, handleCreate, handleRename, handleMove } = useFileManager();

  const [viewingFile, setViewingFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null); // { type: 'file' | 'dir' }
  const [itemToRename, setItemToRename] = useState(null);
  const [itemsToSharePublic, setItemsToSharePublic] = useState(null); // Array of paths
  const [itemsToShareWithUsers, setItemsToShareWithUsers] = useState(null); // Array of paths
  const [itemsToMove, setItemsToMove] = useState(null); // Array of paths

  const handleViewFile = useCallback((item) => {
    setViewingFile(item);
  }, []);

  const handleCreateItem = useCallback(async (name, type) => {
    const result = await handleCreate(name, type);
    if (result.success) {
      setShowCreateModal(null);
    }
  }, [handleCreate]);

  const handleRenameItem = useCallback(async (item, newName) => {
    const result = await handleRename(item, newName);
    if (result.success) {
      setItemToRename(null);
    }
  }, [handleRename]);

  const handleMoveItems = useCallback(async (itemsToMovePaths, destinationPath) => {
    const result = await handleMove(itemsToMovePaths, destinationPath);
    if (result.success) {
      setItemsToMove(null);
    }
  }, [handleMove]);

  const onShareWithUsersSuccess = useCallback(() => {
    setItemsToShareWithUsers(null);
    // No need to setSelectedItems here, as useFileManager handles it
  }, []);

  return {
    viewingFile, setViewingFile: handleViewFile,
    showCreateModal, setShowCreateModal,
    itemToRename, setItemToRename,
    itemsToSharePublic, setItemsToSharePublic,
    itemsToShareWithUsers, setItemsToShareWithUsers,
    itemsToMove, setItemsToMove,
    handleCreateItem, handleRenameItem, handleMoveItems,
    onShareWithUsersSuccess,
  };
};

export default useFileManagerModals;