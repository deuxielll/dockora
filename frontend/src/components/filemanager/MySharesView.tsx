import React, { useState, useEffect, useCallback } from 'react';
import { getSharedByMeItems, unshareFileWithUsers, getFileContent, viewFile } from '../../services/api'; // Import getFileContent and viewFile
import LoadingSpinner from '../LoadingSpinner';
import { Folder, FileText, Users, Trash2, Eye, Download } from 'lucide-react'; // Import Eye and Download icons
import toast from 'react-hot-toast';
import FileViewerModal from '../modals/FileViewerModal'; // Import FileViewerModal

const MySharesView = ({ onRefreshFileManager }) => {
  const [sharedItems, setSharedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShares, setSelectedShares] = useState(new Set());
  const [viewingFile, setViewingFile] = useState(null); // New state for viewing file

  const fetchSharedItems = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getSharedByMeItems();
      setSharedItems(res.data);
      setSelectedShares(new Set()); // Clear selection on refresh
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your shared items.');
      console.error("Error fetching shared by me items:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedItems();
  }, [fetchSharedItems]);

  const handleShareToggle = (shareId) => {
    const newSelection = new Set(selectedShares);
    if (newSelection.has(shareId)) {
      newSelection.delete(shareId);
    } else {
      newSelection.add(shareId);
    }
    setSelectedShares(newSelection);
  };

  const handleUnshareSelected = async () => {
    if (selectedShares.size === 0) return;

    if (window.confirm(`Are you sure you want to unshare ${selectedShares.size} item(s)? This will revoke access for the recipients.`)) {
      try {
        await unshareFileWithUsers(Array.from(selectedShares));
        toast.success(`${selectedShares.size} item(s) unshared successfully.`);
        fetchSharedItems(); // Refresh the list
        onRefreshFileManager(); // Notify parent to refresh main file view if needed
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to unshare item(s).');
      }
    }
  };

  const handleViewFile = (item) => {
    if (item.type === 'dir') {
      toast.error("Cannot view directories directly. Please download.");
      return;
    }
    setViewingFile({
      name: item.name,
      path: item.path, // Use item.path for sharer's own files
      type: item.type,
      isShared: false, // This is the sharer's own file, not a received shared file
      sharer_name: 'You' // Indicate it's the current user's file
    });
  };

  const handleDownloadFile = async (item) => {
    if (item.type === 'dir') {
      toast.error("Cannot download directories directly. Please use the main file manager for folder downloads.");
      return;
    }
    try {
      const response = await viewFile(item.path); // Use viewFile for direct download
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

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleString();

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (sharedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <Users size={48} className="mb-4" />
        <p>You haven't shared any files or folders yet.</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex justify-end mb-4">
          <button
            onClick={handleUnshareSelected}
            disabled={selectedShares.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-red-500 shadow-neo active:shadow-neo-inset disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> Unshare Selected ({selectedShares.size})
          </button>
        </div>
        <table className="w-full text-left select-none">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 w-12"></th> {/* Checkbox column */}
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">Item Name</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden lg:table-cell">Original Path</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden md:table-cell">Shared With</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden sm:table-cell">Date Shared</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 hidden md:table-cell">Size</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sharedItems.map((item) => (
              <tr
                key={item.id}
                className={`transition-colors duration-200 cursor-pointer hover:shadow-neo-inset ${selectedShares.has(item.id) ? 'shadow-neo-inset bg-blue-500/10' : ''}`}
              >
                <td className="p-4" onClick={(e) => { e.stopPropagation(); handleShareToggle(item.id); }}>
                  <div className="w-5 h-5 rounded bg-dark-bg shadow-neo-inset flex items-center justify-center">
                    {selectedShares.has(item.id) && <div className="w-2.5 h-2.5 bg-accent rounded-sm shadow-neo" />}
                  </div>
                </td>
                <td className="p-4 flex items-center gap-3" onClick={() => handleViewFile(item)}>
                  {item.type === 'dir' ? <Folder size={20} className="text-blue-400" /> : <FileText size={20} className="text-gray-400" />}
                  <span className="font-medium text-gray-200 truncate">{item.name}</span>
                </td>
                <td className="p-4 text-sm hidden lg:table-cell truncate text-gray-300" title={item.path}>{item.path}</td>
                <td className="p-4 text-sm hidden md:table-cell text-gray-300">{item.recipient_name}</td>
                <td className="p-4 text-sm hidden sm:table-cell text-gray-300">{formatDate(item.shared_at)}</td>
                <td className="p-4 text-sm hidden md:table-cell text-gray-300">{item.type === 'file' ? formatSize(item.size) : '-'}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {item.type === 'file' && (
                      <button
                        onClick={() => handleViewFile(item)}
                        className="p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all text-gray-300"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(item)}
                      className="p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all text-gray-300"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewingFile && (
        <FileViewerModal
          item={viewingFile}
          onClose={() => setViewingFile(null)}
          // No need for getSharedFileContent/viewSharedFile props here as it's the sharer's own file
        />
      )}
    </>
  );
};

export default MySharesView;