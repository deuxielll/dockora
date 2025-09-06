"use client";

import React from 'react';
import FileViewerModal from '../modals/FileViewerModal';
import CreateItemModal from '../modals/CreateItemModal';
import RenameItemModal from '../modals/RenameItemModal';
import ShareModal from '../modals/ShareModal';
import ShareWithUsersModal from '../modals/ShareWithUsersModal';
import MoveItemModal from '../modals/MoveItemModal'; // New import
import { getSharedWithMeFileContent, viewSharedWithMeFile } from '../../services/api';

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
  itemsToShareWithUsers,
  setItemsToShareWithUsers,
  onShareWithUsersSuccess,
  itemsToMove, // New prop
  setItemsToMove, // New prop
  onMove, // New prop
}) => {
  return (
    <>
      {viewingFile && (
        <FileViewerModal
          item={viewingFile}
          onClose={() => setViewingFile(null)}
          getSharedFileContent={getSharedWithMeFileContent}
          viewSharedFile={viewSharedWithMeFile}
        />
      )}
      {showCreateModal && <CreateItemModal type={showCreateModal.type} onClose={() => setShowCreateModal(null)} onCreate={onCreate} />}
      {itemToRename && <RenameItemModal item={itemToRename} onClose={() => setItemToRename(null)} onRename={onRename} />}
      {itemsToSharePublic && <ShareModal items={itemsToSharePublic} onClose={() => setItemsToSharePublic(null)} />}
      {itemsToShareWithUsers && (
        <ShareWithUsersModal
          itemsToShare={itemsToShareWithUsers}
          onClose={() => setItemsToShareWithUsers(null)}
          onSuccess={onShareWithUsersSuccess}
        />
      )}
      {itemsToMove && ( // Render new MoveItemModal
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