"use client";

import React from 'react';
import ItemContextMenu from './ItemContextMenu';
import EmptySpaceContextMenu from './EmptySpaceContextMenu';

const FileManagerContextMenus = ({
  contextMenu,
  emptySpaceContextMenu,
  closeAllContextMenus,
  isTrashView,
  isSharedWithMeView, // Still passed, but will be false
  isMySharesView, // Still passed, but will be false
  selectedCount,
  singleSelectedItem,
  onView,
  onSharePublic,
  // Removed onShareWithUsers
  onCopyPath,
  onRename,
  onDelete,
  onRestore,
  // Removed onDownloadShared
  onCopy,
  onCut,
  onPaste,
  hasCopiedItems,
  hasCutItems,
  onCreateFile,
  onCreateFolder,
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
        // Removed onShareWithUsers
        onCopyPath={onCopyPath}
        onRename={onRename}
        onDelete={onDelete}
        onRestore={onRestore}
        onClose={closeAllContextMenus}
        // Removed onDownloadShared
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        hasCopiedItems={hasCopiedItems}
        hasCutItems={hasCutItems}
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