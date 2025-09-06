"use client";

import React from 'react';
import FileViewerModal from '../modals/FileViewerModal';
import CreateItemModal from '../modals/CreateItemModal';
import RenameItemModal from '../modals/RenameItemModal';
import ShareModal from '../modals/ShareModal';
// Removed ShareWithUsersModal import
import MoveItemModal from '../modals/MoveItemModal';
import { getFileContent, viewFile } from '../../services/api'; // Adjusted imports

const FileManagerModals = ({
  viewingFile,
  setViewingFile,
  showCreateModal,
  setShowCreateModal,
  onCreate,
  itemToRename,
  setItemToRename,
  onRename,
  itemsToSharePublic,
  setItemsToSharePublic,
  // Removed itemsToShareWithUsers, setItemsToShareWithUsers, onShareWithUsersSuccess
  itemsToMove,
  setItemsToMove,
  onMove,
}) => {
  return (
    <>
      {viewingFile && (
        <FileViewerModal
          item={viewingFile}
          onClose={() => setViewingFile(null)}
          // Removed getSharedFileContent and viewSharedFile props
        />
      )}
      {showCreateModal && <CreateItemModal type={showCreateModal.type} onClose={() => setShowCreateModal(null)} onCreate={onCreate} />}
      {itemToRename && <RenameItemModal item={itemToRename} onClose={() => setItemToRename(null)} onRename={onRename} />}
      {itemsToSharePublic && <ShareModal items={itemsToSharePublic} onClose={() => setItemsToSharePublic(null)} />}
      {/* Removed ShareWithUsersModal rendering */}
      {itemsToMove && (
        <MoveItemModal
          items={itemsToMove}
          onClose={() => setItemsToMove(null)}
          onMove={onMove}
        />
      )}
    </>
  );
};

export default FileManagerModals;