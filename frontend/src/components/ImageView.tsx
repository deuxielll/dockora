import React, { useEffect, useState, useCallback } from "react";
import { getImages, removeImage } from "../services/api";
import { Trash2, Tag, Hash, HardDrive } from "lucide-react";
import toast from "react-hot-toast";

const ImageView = () => {
  const [images, setImages] = useState([]);
  const panelClasses = "bg-dark-bg shadow-neo";

  const fetchImages = useCallback(async () => {
    try {
      const res = await getImages();
      setImages(res.data);
    } catch (err) {
      console.error("Error fetching images:", err);
    }
  }, []);

  const handleRemove = async (id) => {
    try {
      await removeImage(id);
      fetchImages();
      toast.success("Image removed.");
    } catch (err) {
      console.error("Error removing image:", err);
      toast.error(err.response?.data?.error || "Failed to remove image.");
    }
  };

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div>
      <div className={`rounded-xl ${panelClasses}`}>
        {/* Desktop Table */}
        <table className="w-full text-left hidden md:table">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">Tag</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">ID</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200">Size</th>
              <th className="p-4 text-sm font-semibold tracking-wider text-gray-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.length > 0 ? images.map((img) => {
              const isSystemImage = img.tags && img.tags.some(tag => tag.includes('dockora') || tag.includes('postgres'));
              return (
                <tr key={img.id} className="transition-colors duration-300 hover:shadow-neo-inset">
                  <td className="p-4 text-sm break-all text-gray-200">{(img.tags && img.tags.length > 0) ? img.tags.join(', ') : '<none>'}</td>
                  <td className="p-4 font-mono text-xs text-gray-300">{img.id}</td>
                  <td className="p-4 text-sm text-gray-200">{formatSize(img.size)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleRemove(img.id)} 
                      disabled={isSystemImage}
                      title={isSystemImage ? "This is a system image and cannot be deleted." : "Remove Image"}
                      className={`${iconButtonStyles} text-red-500`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="4" className="text-center p-12 text-gray-400">No images found.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="md:hidden p-2">
          {images.length > 0 ? images.map((img) => {
            const isSystemImage = img.tags && img.tags.some(tag => tag.includes('dockora') || tag.includes('postgres'));
            return (
              <div key={img.id} className={`p-4 my-2 rounded-lg ${panelClasses}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 truncate">
                      <Tag size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{(img.tags && img.tags.length > 0) ? img.tags.join(', ') : '<none>'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(img.id)} 
                    disabled={isSystemImage}
                    title={isSystemImage ? "This is a system image and cannot be deleted." : "Remove Image"}
                    className={`ml-4 ${iconButtonStyles} text-red-500`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-gray-400" />
                    <span className="font-mono text-gray-300">{img.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} className="text-gray-400" />
                    <span className="text-gray-200">{formatSize(img.size)}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center p-12 text-gray-400">No images found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageView;