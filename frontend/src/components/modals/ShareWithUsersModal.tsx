import React, { useState, useEffect, useCallback } from 'react';
import { X, Share2, Loader } from 'lucide-react';
import { getUsers, shareFileWithUsers } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const ShareWithUsersModal = ({ itemsToShare, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRes = await getUsers();
      // Filter out the current user from the list of potential recipients
      setUsers(usersRes.data.filter(u => u.id !== currentUser.id));
    } catch (error) {
      console.error("Failed to load users for sharing", error);
      toast.error("Could not load users for sharing.");
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUserToggle = (userId) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleSelectAll = () => {
    const allUserIds = new Set(users.map(u => u.id));
    setSelectedUserIds(allUserIds);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedUserIds.size === 0) {
        toast.error("Please select at least one user to share with.");
        return;
      }
      await shareFileWithUsers(itemsToShare, Array.from(selectedUserIds));
      toast.success(`File(s) shared successfully.`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to share file(s).");
    } finally {
      setIsSaving(false);
    }
  };

  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200 flex items-center gap-2 truncate">
            <Share2 size={20} />
            Share {itemsToShare.length} item(s) with users
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        
        <div className="flex justify-end gap-2 mb-3">
          <button onClick={handleSelectAll} className="text-xs font-semibold text-accent hover:underline">Select All</button>
          <button onClick={handleDeselectAll} className="text-xs font-semibold text-accent hover:underline">Deselect All</button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-32"><Loader className="animate-spin" /></div>
          ) : users.length > 0 ? (
            users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg shadow-neo-inset">
                <div>
                  <p className="font-semibold text-gray-200">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUserToggle(user.id)}
                  className="w-5 h-5 rounded bg-dark-bg shadow-neo-inset flex items-center justify-center flex-shrink-0"
                >
                  {selectedUserIds.has(user.id) && <div className="w-2.5 h-2.5 bg-accent rounded-sm shadow-neo" />}
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">No other users to share with.</p>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700/50">
          <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={isSaving || isLoading || selectedUserIds.size === 0} className={primaryButtonStyles}>
            {isSaving ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareWithUsersModal;