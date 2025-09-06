import React, { useState, useCallback, useEffect } from 'react';
import { Folder, Loader } from 'lucide-react'; // Removed ChevronRight
import { browseFiles, uploadFile } from '../services/api';
import toast from 'react-hot-toast'; // Import toast for notifications

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate, depth = 0 }) => {
    // Removed isExpanded state
    const [subItems, setSubItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [hasChildren, setHasChildren] = useState(false);

    const isSpecialSection = path === 'trash' || path === 'shared-with-me' || path === 'my-shares';

    const fetchContents = useCallback(async () => {
        if (isSpecialSection) {
            setSubItems([]);
            setHasChildren(false);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await browseFiles(path);
            const folders = res.data.filter(item => item.type === 'dir');
            setSubItems(folders);
            setHasChildren(folders.length > 0);
        } catch (err) {
            console.error(`Failed to fetch contents for ${path}:`, err);
            setHasChildren(false);
        } finally {
            setIsLoading(false);
        }
    }, [path, isSpecialSection]);

    useEffect(() => {
        // Always fetch contents for non-special folders if not collapsed
        if (!isCollapsed && !isSpecialSection) {
            fetchContents();
        }
    }, [fetchContents, isCollapsed, isSpecialSection]);

    // Removed handleToggleExpand

    const handleNavigate = () => {
        onNavigate(path);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isSpecialSection) { // Only check for special sections, as folders are always 'open'
            toast.error("Cannot upload files to this section.");
            return;
        }
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const uploadPromises = files.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('path', path);
                return uploadFile(formData);
            });
            try {
                await Promise.all(uploadPromises);
                fetchContents(); // Refresh contents after upload
                toast.success(`${files.length} file(s) uploaded to ${name}.`);
            } catch (err) {
                toast.error(err.response?.data?.error || 'An error occurred during upload.');
            }
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

    const itemPadding = `pl-${4 + depth * 4}`; // Increase padding for nested items

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`rounded-lg transition-colors ${isDragging ? 'bg-blue-500/20' : ''}`}
        >
            <div
                onClick={handleNavigate}
                title={name}
                className={`flex items-center ${itemPadding} py-3 rounded-lg cursor-pointer transition-all hover:shadow-neo-inset`}
            >
                <Icon size={20} className="text-gray-300" />
                {!isCollapsed && (
                    <>
                        <span className="ml-4 font-semibold flex-grow text-gray-200">{name}</span>
                        {/* Removed expand/collapse button */}
                    </>
                )}
            </div>
            {/* Always render sub-items if not collapsed and not a special section */}
            {!isCollapsed && !isSpecialSection && hasChildren && (
                <div className="py-1 space-y-1">
                    {isLoading ? (
                        <div className={`flex items-center gap-2 ${itemPadding} py-2 text-sm text-gray-400`}>
                            <Loader size={16} className="animate-spin" /> Loading...
                        </div>
                    ) : subItems.length > 0 ? subItems.map(item => (
                        <SidebarItem
                            key={item.path}
                            name={item.name}
                            icon={Folder} // All sub-items here are folders
                            path={item.path}
                            isCollapsed={isCollapsed}
                            onNavigate={onNavigate}
                            depth={depth + 1}
                        />
                    )) : (
                        <p className={`${itemPadding} py-2 text-xs text-gray-400`}>No subfolders</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SidebarItem;