import React, { useState, useEffect } from "react";
import { X, Link, Copy, Trash2, Loader } from "lucide-react";
import { createShare, deleteShare } from "../../services/api";

const ShareModal = ({ items, onClose, systemRootAccess = false }) => {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (items && items.length > 0) {
      if (items.length === 1) {
        setName(items[0].split('/').pop());
      } else {
        setName(`${items.length} Shared Items`);
      }
    }
  }, [items]);

  const handleCreatePublicLink = async () => {
    if (!name) {
      setError("Share name cannot be empty.");
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const shareRes = await createShare({ paths: items, name, system_root_access: systemRootAccess });
      setToken(shareRes.data.token);
    } catch (err) {
      setError("Failed to create public link.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePublicLink = async () => {
    try {
      await deleteShare(token);
      setToken(null);
      setError('');
    } catch (err) {
      setError("Failed to delete public link.");
    }
  };

  const getShareUrl = () => {
    if (!token) return "";
    const { protocol, hostname } = window.location;
    const backendPort = 5000;
    return `${protocol}//${hostname}:${backendPort}/shares/${token}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl());
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const secondaryButtonStyles = "px-4 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200 flex items-center gap-2 truncate">
            <Link size={20} />
            Share {items.length} item(s)
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-6 no-scrollbar">
          <div>
            <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Link size={18} /> Public Link</h3>
            {token ? (
              <div>
                <div className="flex gap-2">
                  <input type="text" value={getShareUrl()} readOnly className={`${inputStyles} font-mono text-sm`} />
                  <button onClick={handleCopy} title="Copy Link" className={`${secondaryButtonStyles} !px-4`}><Copy size={18} /></button>
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={handleDeletePublicLink} className="flex items-center gap-2 text-sm font-semibold text-red-500 p-2 rounded-lg hover:bg-red-900/30 transition-colors">
                    <Trash2 size={14} /> Stop Sharing
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg shadow-neo-inset">
                <div className="mb-4">
                  <label htmlFor="shareName" className="block text-sm font-medium mb-2 text-gray-400">Share Name</label>
                  <input
                    type="text"
                    id="shareName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputStyles}
                    required
                  />
                </div>
                <div className="text-center">
                  <button onClick={handleCreatePublicLink} disabled={isCreating} className={`${secondaryButtonStyles} flex items-center justify-center gap-2 w-full sm:w-auto`}>
                    {isCreating ? <Loader size={18} className="animate-spin" /> : <Link size={18} />}
                    {isCreating ? 'Creating...' : 'Create Public Link'}
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;