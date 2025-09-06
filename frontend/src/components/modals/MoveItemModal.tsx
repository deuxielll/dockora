"use client";

import React, { useState } from "react";
import { X, FolderInput } from "lucide-react";

const MoveItemModal = ({ items, onClose, onMove }) => {
  const [destinationPath, setDestinationPath] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destinationPath.trim()) {
      setError("Destination path cannot be empty.");
      return;
    }
    setError("");
    setIsLoading(true);
    await onMove(items, destinationPath);
    setIsLoading(false);
    onClose();
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg shadow-neo rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-200 flex items-center gap-2">
            <FolderInput size={20} />
            Move {items.length} Item(s)
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="destinationPath" className="block text-sm font-medium mb-2 text-gray-400">Destination Path</label>
            <input
              type="text"
              id="destinationPath"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              className={inputStyles}
              placeholder="e.g., /Documents/NewFolder"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <div className="flex justify-end gap-4 mt-4">
            <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
            <button type="submit" disabled={isLoading} className={primaryButtonStyles}>
              {isLoading ? "Moving..." : "Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveItemModal;