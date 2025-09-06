import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Folder, Clock, CheckCircle, Loader } from 'lucide-react'; // Removed Share2
import { getRecentFileActivity } from '../../services/api'; // Removed getNewSharedFilesCount
import { useInterval } from '../../hooks/useInterval';
import LoadingSpinner from '../LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import FileViewerModal from '../modals/FileViewerModal';
import FileActivitySkeleton from '../skeletons/FileActivitySkeleton'; // Import skeleton

const FileActivityWidget = () => {
  const [recentFiles, setRecentFiles] = useState([]);
  // Removed newSharedCount state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recentRes = await getRecentFileActivity(); // Removed sharedRes
      setRecentFiles(recentRes.data);
      // Removed setNewSharedCount(sharedRes.data.count);
    } catch (err) {
      setError("Failed to fetch file activity.");
      console.error("File activity fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 15000);

  const formatTimeAgo = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  const handleItemClick = (item) => {
    if (item.type === 'dir') {
      navigate('/files', { state: { path: item.path } });
    } else {
      setViewingFile(item);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <FileActivitySkeleton />; // Render skeleton when loading
    }
    if (error) {
      return <div className="flex-grow flex items-center justify-center text-center text-red-500 text-sm">{error}</div>;
    }

    const hasActivity = recentFiles.length > 0; // Removed newSharedCount > 0

    if (!hasActivity) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
          <CheckCircle size={48} className="mb-4 text-green-500" />
          <p className="font-semibold text-gray-200">You're all caught up!</p>
          <p className="text-sm">No recent file activity.</p> {/* Adjusted message */}
        </div>
      );
    }

    return (
      <div className="flex-grow flex flex-col overflow-y-auto no-scrollbar pr-2">
        {/* Removed newSharedCount banner */}

        {recentFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400 mb-2">Recent Activity:</p>
            {recentFiles.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between p-2 rounded-lg bg-dark-bg-secondary shadow-neo-inset w-full text-left hover:shadow-neo active:shadow-neo-inset transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'dir' ? <Folder size={16} className="text-blue-400 flex-shrink-0" /> : <FileText size={16} className="text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-medium text-gray-200 truncate" title={item.name}>{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0 ml-2">
                  <Clock size={14} />
                  <span>{formatTimeAgo(item.modified_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
      {viewingFile && (
        <FileViewerModal
          item={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
};

export default FileActivityWidget;