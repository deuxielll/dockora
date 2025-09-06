import React from 'react';
import { ArrowUp, Upload, FilePlus, FolderPlus, RotateCcw, Trash2 } from 'lucide-react'; // Removed Download

const FileManagerActions = ({
  isTrashView,
  isSharedWithMeView, // Still passed, but will be false
  selectedCount,
  itemCount,
  currentPath,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
  onUploadClick,
  onCreateFile,
  onCreateFolder,
  onGoUp,
  onDownloadShared, // Still passed, but will be a no-op
  singleSelectedItem,
}) => {
  const actionButtonStyles = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-gray-200 shadow-neo active:shadow-neo-inset disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex gap-2 flex-wrap">
      {isTrashView ? (
        <>
          <button onClick={onRestore} disabled={selectedCount === 0} className={actionButtonStyles}><RotateCcw size={16} /> Restore</button>
          <button onClick={onDeletePermanently} disabled={selectedCount === 0} className={`${actionButtonStyles} !text-red-500`}><Trash2 size={16} /> Delete Permanently</button>
          <button onClick={onEmptyTrash} disabled={itemCount === 0} className={`${actionButtonStyles} !text-red-500`}><Trash2 size={16} /> Empty Trash</button>
        </>
      ) : ( // Simplified: no isSharedWithMeView condition
        <>
          <button onClick={onUploadClick} className={actionButtonStyles}><Upload size={16} /> Upload</button>
          <button onClick={onCreateFile} className={actionButtonStyles}><FilePlus size={16} /> New File</button>
          <button onClick={onCreateFolder} className={actionButtonStyles}><FolderPlus size={16} /> New Folder</button>
        </>
      )}
      {!isTrashView && <button onClick={onGoUp} disabled={currentPath === '/'} className={actionButtonStyles}><ArrowUp size={16} /> Up</button>}
    </div>
  );
};

export default FileManagerActions;