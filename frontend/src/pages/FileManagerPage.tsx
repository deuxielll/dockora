import React, { useState, useEffect, useCallback, useRef } from 'react';
import { browseFiles, createItem, uploadFile, deleteItem, renameItem, moveItems, getTrashItems, restoreTrashItems, deleteTrashItemsPermanently, emptyTrash, getSharedWithMeItems, viewSharedWithMeFile, downloadSharedWithMeFile, getSharedWithMeFileContent, unshareFileWithUsers, getSharedByMeItems, updateLastViewedSharedFilesTimestamp, createShare, deleteShare } from '../services/api';
import FileViewerModal from '../components/modals/FileViewerModal';
import CreateItemModal from '../components/modals/CreateItemModal';
import RenameItemModal from '../components/modals/RenameItemModal';
import ShareModal from '../components/modals/ShareModal';
import ShareWithUsersModal from '../components/modals/ShareWithUsersModal';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/filemanager/Breadcrumbs';
import FileManagerActions from '../components/filemanager/FileManagerActions';
import FileTable from '../components/filemanager/FileTable';
import ItemContextMenu from '../components/filemanager/ItemContextMenu';
import EmptySpaceContextMenu from '../components/filemanager/EmptySpaceContextMenu';
import MySharesView from '../components/filemanager/MySharesView';
import toast from 'react-hot-toast';

const FileManagerPage = () => {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(null);
  const [itemToRename, setItemToRename] = useState(null);
  const [itemsToSharePublic, setItemsToSharePublic] = useState(null); // For public links
  const [itemsToShareWithUsers, setItemsToShareWithUsers] = useState(null); // For user-to-user sharing
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [emptySpaceContextMenu, setEmptySpaceContextMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [draggedOverItem, setDraggedOverItem] = useState(null);
  const fileInputRef = useRef(null);
  const panelClasses = "bg-dark-bg shadow-neo";
  
  const isTrashView = currentPath === 'trash';
  const isSharedWithMeView = currentPath === 'shared-with-me';
  const isMySharesView = currentPath === 'my-shares';
  const isAdminRootView = currentPath === '/' && currentUser?.role === 'admin' && localStorage.getItem('isAdminRootView') === 'true';

  const handleNavigate = useCallback(async (path, isSystemRoot = false) => {
    if (isSystemRoot && currentUser?.role === 'admin') {
      localStorage.setItem('isAdminRootView', 'true');
      setCurrentPath('/'); // Always set to '/' for system root
    } else if (path === '/') {
      localStorage.removeItem('isAdminRootView');
      setCurrentPath('/'); // Default home for non-admin or regular home for admin
    } else {
      localStorage.removeItem('isAdminRootView');
      setCurrentPath(path);
    }
  }, [currentUser]);

  useEffect(() => {
    // Initialize isAdminRootView state from localStorage on component mount
    if (currentUser?.role === 'admin' && localStorage.getItem('isAdminRootView') === 'true') {
      // If currentPath is not '/', it means user navigated away from root, so clear flag
      if (currentPath !== '/') {
        localStorage.removeItem('isAdminRootView');
      }
    } else {
      localStorage.removeItem('isAdminRootView');
    }
  }, [currentUser, currentPath]);


  const fetchItems = useCallback(async (path) => {
    setIsLoading(true);
    setError('');
    try {
      let res;
      if (path === 'trash') {
        res = await getTrashItems();
      } else if (path === 'shared-with-me') {
        res = await getSharedWithMeItems();
        await updateLastViewedSharedFilesTimestamp(); // Mark shared files as seen
      } else if (path === 'my-shares') {
        setItems([]); 
        setIsLoading(false);
        return;
      } else {
        res = await browseFiles(path, isAdminRootView);
      }
      setItems(res.data);
      setSelectedItems(new Set());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load directory.');
      // If an error occurs and it's not a special view, try to go to user's home
      if (path !== '/' && !isTrashView && !isSharedWithMeView && !isMySharesView && !isAdminRootView) {
        setCurrentPath('/');
        localStorage.removeItem('isAdminRootView');
      } else if (isAdminRootView && path !== '/') { // If admin root view and path is not root, reset to root
        setCurrentPath('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdminRootView, isTrashView, isSharedWithMeView, isMySharesView]);

  const closeAllContextMenus = useCallback(() => {
    setContextMenu(null);
    setEmptySpaceContextMenu(null);
  }, []);

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath, fetchItems]);

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
    }
  };

  const goUp = () => {
    if (isAdminRootView) {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      setCurrentPath(parentPath === '' ? '/' : parentPath);
    } else if (currentPath !== '/') {
      setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/');
    }
  };

  const handleCreate = async (name) => {
    try {
      await createItem({ path: currentPath, name, type: showCreateModal.type, system_root_access: isAdminRootView });
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
      formData.append('system_root_access', isAdminRootView);
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
    
    if (isSharedWithMeView) {
        if (window.confirm(`Are you sure you want to remove ${itemsToDelete.length} item(s) from your 'Shared with me' list? This will not delete the original files.`)) {
            try {
                await unshareFileWithUsers(itemsToDelete);
                toast.success(`${itemsToDelete.length} item(s) removed from 'Shared with me'.`);
                fetchItems(currentPath);
            } catch (err) {
                toast.error(err.response?.data?.error || 'Failed to remove shared item(s).');
            }
        }
        return;
    }

    if (isMySharesView) {
        if (window.confirm(`Are you sure you want to unshare ${itemsToDelete.length} item(s)? This will revoke access for the recipients.`)) {
            try {
                await unshareFileWithUsers(itemsToDelete);
                toast.success(`${itemsToDelete.length} item(s) unshared successfully.`);
                fetchItems(currentPath);
            } catch (err) {
                toast.error(err.response?.data?.error || 'Failed to unshare item(s).');
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
        else await deleteItem(itemsToDelete, isAdminRootView);
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
      await renameItem(itemToRename.path, newName, isAdminRootView);
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
        if (isMySharesView) return `${item.recipient_name}:${item.path}`;
        return item.path;
    });
    navigator.clipboard.writeText(pathsToCopy.join('\n'))
      .then(() => toast.success('Path(s) copied to clipboard.'))
      .catch(() => toast.error('Failed to copy paths.'));
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
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    closeAllContextMenus();
    if (!isTrashView && !isSharedWithMeView && !isMySharesView) setEmptySpaceContextMenu({ x: event.pageX, y: event.pageY });
  };

  const handleDragStart = (e, item) => {
    e.stopPropagation();
    if (isTrashView || isSharedWithMeView || isMySharesView) {
        e.preventDefault(); 
        return;
    }
    const itemIdentifier = getItemIdentifier(item);
    const draggedItems = selectedItems.has(itemIdentifier) ? Array.from(selectedItems) : [itemIdentifier];
    if (!selectedItems.has(itemIdentifier)) setSelectedItems(new Set(draggedItems));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ paths: draggedItems, system_root_access: isAdminRootView }));

    const dragPreview = document.createElement('div');
    dragPreview.id = 'drag-preview';
    const iconHTML = item.type === 'dir'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    dragPreview.innerHTML = `${iconHTML}<span>${draggedItems.length > 1 ? `${draggedItems.length} items` : item.name}</span>`;
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
    const draggedDataJSON = e.dataTransfer.getData('application/json');
    if (!draggedDataJSON) return;
    try {
        const { paths: sourcePaths, system_root_access: sourceSystemRootAccess } = JSON.parse(draggedDataJSON);
        if (sourcePaths.includes(dropTargetItem.path)) return;
        
        // If dragging from system root to non-system root, or vice-versa, it's a problem
        if (sourceSystemRootAccess !== isAdminRootView) {
          toast.error("Cannot move items between system root and user home directories directly.");
          return;
        }

        await moveItems(sourcePaths, dropTargetItem.path, isAdminRootView);
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
        sharer_name: item.sharer_name,
        is_system_root_share: item.is_system_root_share // Pass this flag
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
        <Sidebar onNavigate={handleNavigate} currentUser={currentUser} />
        <div className="flex-1 flex flex-col overflow-hidden ml-6">
          <h2 className="text-2xl font-bold text-gray-200 mb-6">File Manager</h2>
          <div 
            className={`p-6 rounded-xl ${panelClasses} relative flex-1 flex flex-col overflow-hidden`} 
            onDragOver={handleDragOver} 
            onDragLeave={() => setIsDragging(false)} 
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onClick={() => { setSelectedItems(new Set()); closeAllContextMenus(); }}
            onContextMenu={handleEmptySpaceContextMenu}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex items-center justify-center z-10 pointer-events-none shadow-neo">
                <p className="text-lg font-semibold text-white">Drop files to upload</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 flex-shrink-0">
              <div className="flex-grow">
                <Breadcrumbs currentPath={currentPath} setCurrentPath={handleNavigate} isTrashView={isTrashView} isSharedWithMeView={isSharedWithMeView} isMySharesView={isMySharesView} />
                {selectedCount > 0 && !isMySharesView && <p className="text-sm text-gray-200 mt-1">{selectedCount} item(s) selected</p>}
              </div>
              {!isMySharesView && (
                <FileManagerActions
                  isTrashView={isTrashView}
                  isSharedWithMeView={isSharedWithMeView}
                  selectedCount={selectedCount}
                  itemCount={items.length}
                  currentPath={currentPath}
                  onRestore={handleRestoreMultiple}
                  onDeletePermanently={handleDeleteMultiple}
                  onEmptyTrash={handleEmptyTrash}
                  onUploadClick={() => fileInputRef.current.click()}
                  onCreateFile={() => setShowCreateModal({ type: 'file' })}
                  onCreateFolder={() => setShowCreateModal({ type: 'dir' })}
                  onGoUp={goUp}
                  onDownloadShared={handleDownloadSharedFile}
                  singleSelectedItem={singleSelectedItem}
                />
              )}
              <input type="file" multiple ref={fileInputRef} onChange={(e) => handleUpload(e.target.files)} className="hidden" />
            </div>
            <div className="overflow-y-auto flex-grow no-scrollbar" onClick={(e) => e.stopPropagation()}>
              {isMySharesView ? (
                <MySharesView onRefreshFileManager={() => fetchItems(currentPath)} />
              ) : (
                <FileTable
                  items={items}
                  isLoading={isLoading}
                  error={error}
                  isTrashView={isTrashView}
                  isSharedWithMeView={isSharedWithMeView}
                  selectedItems={selectedItems}
                  draggedOverItem={draggedOverItem}
                  onItemClick={handleItemClick}
                  onItemDoubleClick={handleItemDoubleClick}
                  onItemContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  onItemDragEnter={(e, item) => { e.preventDefault(); e.stopPropagation(); if (item.type === 'dir' && !isTrashView && !isSharedWithMeView && !isMySharesView) setDraggedOverItem(getItemIdentifier(item)); }}
                  onItemDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDraggedOverItem(null); }}
                  onDropOnItem={handleDropOnItem}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {viewingFile && (
        <FileViewerModal 
            item={viewingFile} 
            onClose={() => setViewingFile(null)} 
            getSharedFileContent={getSharedWithMeFileContent}
            viewSharedFile={viewSharedWithMeFile}
        />
      )}
      {showCreateModal && <CreateItemModal type={showCreateModal.type} onClose={() => setShowCreateModal(null)} onCreate={handleCreate} />}
      {itemToRename && <RenameItemModal item={itemToRename} onClose={() => setItemToRename(null)} onRename={handleRename} />}
      {itemsToSharePublic && <ShareModal items={itemsToSharePublic} onClose={() => setItemsToSharePublic(null)} systemRootAccess={isAdminRootView} />}
      {itemsToShareWithUsers && (
        <ShareWithUsersModal
          itemsToShare={itemsToShareWithUsers}
          onClose={() => setItemsToShareWithUsers(null)}
          onSuccess={() => {
            setItemsToShareWithUsers(null);
            setSelectedItems(new Set());
          }}
          systemRootAccess={isAdminRootView}
        />
      )}
      <ItemContextMenu
        contextMenu={contextMenu}
        isTrashView={isTrashView}
        isSharedWithMeView={isSharedWithMeView}
        isMySharesView={isMySharesView}
        selectedCount={selectedCount}
        singleSelectedItem={singleSelectedItem}
        onView={() => handleItemDoubleClick(singleSelectedItem)}
        onSharePublic={() => setItemsToSharePublic(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path))}
        onShareWithUsers={() => setItemsToShareWithUsers(Array.from(selectedItems).map(id => items.find(i => getItemIdentifier(i) === id).path))}
        onCopyPath={handleCopyMultiplePaths}
        onRename={() => setItemToRename(singleSelectedItem)}
        onDelete={handleDeleteMultiple}
        onRestore={handleRestoreMultiple}
        onClose={closeAllContextMenus}
        onDownloadShared={() => handleDownloadSharedFile(singleSelectedItem)}
      />
      <EmptySpaceContextMenu
        contextMenu={emptySpaceContextMenu}
        onCreateFile={() => setShowCreateModal({ type: 'file' })}
        onCreateFolder={() => setShowCreateModal({ type: 'dir' })}
        onClose={closeAllContextMenus}
      />
    </>
  );
};

export default FileManagerPage;