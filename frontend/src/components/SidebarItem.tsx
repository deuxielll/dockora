import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Folder, Loader } from 'lucide-react';
import { browseFiles, uploadFile } from '../services/api';
import toast from 'react-hot-toast'; // Import toast for notifications

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subItems, setSubItems] = useState([]); // Renamed from subfolders to subItems
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [hasChildren, setHasChildren] = useState(false); // Renamed from hasSubfolders to hasChildren

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
        // Only fetch contents for regular folders on initial render if not collapsed and not a special section
        // And only if it's a top-level item or already expanded
        if (!isCollapsed && !isSpecialSection && (depth === 0 || isExpanded)) {
            fetchContents();
        }
    }, [fetchContents, isCollapsed, isSpecialSection, depth, isExpanded]);

    const handleToggleExpand = (e) => {
        e.stopPropagation();
        if (isCollapsed || isSpecialSection) return;
        setIsExpanded(!isExpanded);
        if (!isExpanded && subItems.length === 0) { // Fetch subfolders only when expanding for the first time
            fetchContents();
        }
    };

    const handleNavigate = () => {
        onNavigate(path);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isSpecialSection || !isExpanded) { // Only allow drop if it's an expanded folder
            toast.error("Cannot upload files to this section or unexpanded folder.");
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
                className={`flex items-center ${itemPadding} py-3 rounded-lg cursor-pointer transition-all ${isExpanded && !isCollapsed && !isSpecialSection ? 'shadow-neo-inset' : 'hover:shadow-neo-inset'}`}
            >
                <Icon size={20} className="text-gray-300" />
                {!isCollapsed && (
                    <>
                        <span className="ml-4 font-semibold flex-grow text-gray-200">{name}</span>
                        {hasChildren && !isSpecialSection && (
                            <button onClick={handleToggleExpand} className="p-1 rounded-full hover:bg-gray-500/20">
                                <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                        )}
                    </>
                )}
            </div>
            {!isCollapsed && isExpanded && !isSpecialSection && (
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