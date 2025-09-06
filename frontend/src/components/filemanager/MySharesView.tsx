import React from 'react';
import { Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FileTable from './FileTable'; // Import FileTable

const MySharesView = ({
  items,
  isLoading,
  error,
  selectedItems,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  onDeleteSelected, // Renamed from onUnshareSelected to onDeleteSelected for consistency with FileTable's parent
  onRefreshFileManager,
  searchTerm,
  sortColumn,
  sortDirection,
  onSort,
}) => {
  const handleUnshareSelected = async () => {
    if (selectedItems.size === 0) return;

    if (window.confirm(`Are you sure you want to unshare ${selectedItems.size} item(s)? This will revoke access for the recipients.`)) {
      try {
        // onDeleteSelected will handle the actual API call and refresh
        await onDeleteSelected(Array.from(selectedItems));
        toast.success(`${selectedItems.size} item(s) unshared successfully.`);
        onRefreshFileManager(); // Notify parent to refresh main file view if needed
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to unshare item(s).');
      }
    }
  };

  if (isLoading) {
    // FileTableSkeleton will be rendered by FileTable itself
    return <FileTable
      items={[]} // Pass empty items, FileTable will show skeleton
      isLoading={true}
      error={null}
      isTrashView={false}
      isSharedWithMeView={false}
      selectedItems={selectedItems}
      onItemClick={onItemClick}
      onItemDoubleClick={onItemDoubleClick}
      onItemContextMenu={onItemContextMenu}
      searchTerm={searchTerm}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={onSort}
    />;
  }
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
        <Users size={48} className="mb-4" />
        <p>You haven't shared any files or folders yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleUnshareSelected}
          disabled={selectedItems.size === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-red-500 shadow-neo active:shadow-neo-inset disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} /> Unshare Selected ({selectedItems.size})
        </button>
      </div>
      <FileTable
        items={items}
        isLoading={isLoading}
        error={error}
        isTrashView={false}
        isSharedWithMeView={false}
        isMySharesView={true} // Indicate this is My Shares view for specific column headers
        selectedItems={selectedItems}
        onItemClick={onItemClick}
        onItemDoubleClick={onItemDoubleClick}
        onItemContextMenu={onItemContextMenu}
        searchTerm={searchTerm}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </div>
  );
};

export default MySharesView;