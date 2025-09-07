import React, { useState, useEffect } from 'react';
import { X, Link, Loader, RefreshCw } from 'lucide-react';
import { getUrlMetadata } from '../../services/api';
import toast from 'react-hot-toast';

const AddBookmarkModal = ({ onClose, onSave }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [error, setError] = useState('');

  const isValidUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      // A simple check for domain.tld format
      return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(urlString);
    }
  };

  const handleFetchMetadata = async () => {
    if (!url || !isValidUrl(url)) {
      toast.error("Please enter a valid URL first.");
      return;
    }
    setIsFetchingMeta(true);
    try {
      const res = await getUrlMetadata(url);
      if (res.data.title) setTitle(res.data.title);
      if (res.data.favicon_url) setIconUrl(res.data.favicon_url);
    } catch (err) {
      toast.error("Could not fetch metadata for this URL.");
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL.');
      return;
    }
    if (!title) {
      setError('Please enter a title.');
      return;
    }
    setIsSaving(true);
    
    let finalUrl = url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'http://' + finalUrl;
    }

    onSave({
      id: `bookmark-${crypto.randomUUID()}`,
      name: title,
      url: finalUrl,
      iconUrl: iconUrl,
    });
    // onSave will handle closing the modal
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200 flex items-center gap-2">
            <Link size={20} />
            Add Bookmark
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium mb-2 text-gray-400">URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={inputStyles}
                placeholder="https://example.com"
                required
                autoFocus
              />
              <button type="button" onClick={handleFetchMetadata} disabled={isFetchingMeta} className={`${secondaryButtonStyles} !px-4`} title="Fetch metadata">
                {isFetchingMeta ? <Loader size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium mb-2 text-gray-400">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputStyles}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="iconUrl" className="block text-sm font-medium mb-2 text-gray-400">Icon URL (Optional)</label>
            <input
              type="text"
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className={inputStyles}
              placeholder="Auto-detected or paste URL"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <div className="flex justify-end gap-4 mt-4">
            <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
            <button type="submit" disabled={isSaving} className={primaryButtonStyles}>
              {isSaving ? "Saving..." : "Save Bookmark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookmarkModal;