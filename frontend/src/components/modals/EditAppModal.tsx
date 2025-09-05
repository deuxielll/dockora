import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { renameContainer } from "../../services/api";
import { useSettings } from '../../hooks/useSettings';

const EditAppModal = ({ app, onClose, onSuccess }) => {
  const { settings, setSetting } = useSettings();
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (app) {
      setName(app.name);
      const customIcons = JSON.parse(settings.customAppIcons || '{}');
      setIconUrl(customIcons[app.id] || "");
    }
  }, [app, settings.customAppIcons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Handle renaming if name changed
      if (name !== app.name) {
        await renameContainer(app.id, name);
      }

      // Handle custom icon URL
      const customIcons = JSON.parse(settings.customAppIcons || '{}');
      if (iconUrl) {
        customIcons[app.id] = iconUrl;
      } else {
        delete customIcons[app.id]; // Remove if cleared
      }
      await setSetting('customAppIcons', JSON.stringify(customIcons));

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update application.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!app) return null;

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200">Edit Application</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-400">App Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputStyles}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="iconUrl" className="block text-sm font-medium mb-2 text-gray-400">Custom Icon URL (Optional)</label>
            <input
              type="text"
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className={inputStyles}
              placeholder="https://path.to/icon.png"
            />
             <p className="text-xs text-gray-400 mt-1">Leave blank to use the auto-detected icon.</p>
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <div className="flex justify-end gap-4 mt-4">
            <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
            <button type="submit" disabled={isLoading} className={primaryButtonStyles}>
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAppModal;