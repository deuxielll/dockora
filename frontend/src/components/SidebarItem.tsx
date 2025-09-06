import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Folder, Loader } from 'lucide-react';
import { browseFiles, uploadFile, moveItems } from '../services/api'; // Import moveItems
import toast from 'react-hot-toast';

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate, depth = 0, onRefreshFileManager }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subItems, setSubItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false); // Renamed from isDragging to isDraggingOver
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
        if (!isCollapsed && !isSpecialSection && (depth === 0 || isExpanded)) {
            fetchContents();
        }
    }, [fetchContents, isCollapsed, isSpecialSection, depth, isExpanded]);

    const handleToggleExpand = (e) => {
        e.stopPropagation();
        if (isCollapsed || isSpecialSection) return;
        setIsExpanded(!isExpanded);
        if (!isExpanded && subItems.length === 0) {
            fetchContents();
        }
    };

    const handleNavigate = () => {
        onNavigate(path);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        if (isSpecialSection) {
            toast.error("Cannot drop items into this section.");
            return;
        }
        if (!isExpanded && e.dataTransfer.types.includes('Files')) {
            toast.error("Please expand the folder to upload files into it.");
            return;
        }
        if (!isExpanded && e.dataTransfer.types.includes('application/json')) {
            toast.error("Please expand the folder to move items into it.");
            return;
        }

        // Handle file uploads
        if (e.dataTransfer.types.includes('Files')) {
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
                    fetchContents(); // Refresh sub-items in sidebar
                    onRefreshFileManager(); // Refresh main file manager content
                    toast.success(`${files.length} file(s) uploaded to ${name}.`);
                } catch (err) {
                    toast.error(err.response?.data?.error || 'An error occurred during upload.');
                }
            }
        } 
        // Handle moving existing items
        else if (e.dataTransfer.types.includes('application/json')) {
            try {
                const sourcePaths = JSON.parse(e.dataTransfer.getData('application/json'));
                if (sourcePaths.includes(path) || sourcePaths.some(p => p.startsWith(path + '/'))) {
                    toast.error("Cannot move a folder into itself or its subfolder.");
                    return;
                }
                await moveItems(sourcePaths, path);
                onRefreshFileManager(); // Refresh main file manager content
                toast.success(`${sourcePaths.length} item(s) moved to ${name}.`);
            } catch (err) {
                toast.error(err.response?.data?.error || 'Failed to move item(s).');
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSpecialSection) {
            setIsDraggingOver(true);
        }
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const itemPadding = `pl-${4 + depth * 4}`;

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`rounded-lg transition-colors ${isDraggingOver ? 'bg-blue-500/20' : ''}`}
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
                            icon={Folder}
                            path={item.path}
                            isCollapsed={isCollapsed}
                            onNavigate={onNavigate}
                            depth={depth + 1}
                            onRefreshFileManager={onRefreshFileManager} // Pass refresh prop
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