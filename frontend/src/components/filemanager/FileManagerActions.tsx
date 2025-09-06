import React from 'react';
import { ArrowUp, Upload, FilePlus, FolderPlus, RotateCcw, Trash2, Download } from 'lucide-react';

const FileManagerActions = ({
  isTrashView,
  isSharedWithMeView,
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
  onDownloadShared,
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
      ) : isSharedWithMeView ? (
        <>
          {singleSelectedItem && ( // Allow download for both files and folders
            <button onClick={() => onDownloadShared(singleSelectedItem)} className={actionButtonStyles}><Download size={16} /> Download</button>
          )}
          <button onClick={onDeletePermanently} disabled={selectedCount === 0} className={`${actionButtonStyles} !text-red-500`}><Trash2 size={16} /> Remove from list</button>
        </>
      ) : (
        <>
          <button onClick={onUploadClick} className={actionButtonStyles}><Upload size={16} /> Upload</button>
          <button onClick={onCreateFile} className={actionButtonStyles}><FilePlus size={16} /> New File</button>
          <button onClick={onCreateFolder} className={actionButtonStyles}><FolderPlus size={16} /> New Folder</button>
        </>
      )}
      {!isTrashView && !isSharedWithMeView && <button onClick={onGoUp} disabled={currentPath === '/'} className={actionButtonStyles}><ArrowUp size={16} /> Up</button>}
    </div>
  );
};

export default FileManagerActions;