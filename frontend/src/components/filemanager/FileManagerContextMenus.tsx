"use client";

import React from 'react';
import ItemContextMenu from './ItemContextMenu';
import EmptySpaceContextMenu from './EmptySpaceContextMenu';

const FileManagerContextMenus = ({
  contextMenu,
  emptySpaceContextMenu,
  closeAllContextMenus,
  isTrashView,
  isSharedWithMeView,
  isMySharesView,
  selectedCount,
  singleSelectedItem,
  onView,
  onSharePublic,
  onShareWithUsers,
  onShareWithAdmin, // New prop
  onCopyPath,
  onRename,
  onDelete,
  onRestore,
  onDownloadShared,
  onCopy,
  onCut,
  onPaste,
  hasCopiedItems,
  hasCutItems,
  onCreateFile,
  onCreateFolder,
  onMove,
}) => {
  return (
    <>
      <ItemContextMenu
        contextMenu={contextMenu}
        isTrashView={isTrashView}
        isSharedWithMeView={isSharedWithMeView}
        isMySharesView={isMySharesView}
        selectedCount={selectedCount}
        singleSelectedItem={singleSelectedItem}
        onView={onView}
        onSharePublic={onSharePublic}
        onShareWithUsers={onShareWithUsers}
        onShareWithAdmin={onShareWithAdmin} // New prop
        onCopyPath={onCopyPath}
        onRename={onRename}
        onDelete={onDelete}
        onRestore={onRestore}
        onClose={closeAllContextMenus}
        onDownloadShared={onDownloadShared}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        hasCopiedItems={hasCopiedItems}
        hasCutItems={hasCutItems}
        onMove={onMove}
      />
      <EmptySpaceContextMenu
        contextMenu={emptySpaceContextMenu}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onClose={closeAllContextMenus}
        onPaste={onPaste}
        hasCopiedItems={hasCopiedItems}
        hasCutItems={hasCutItems}
      />
    </>
  );
};

export default FileManagerContextMenus;