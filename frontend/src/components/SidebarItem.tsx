import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Folder, Loader } from 'lucide-react';
import { browseFiles, uploadFile } from '../services/api';

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subfolders, setSubfolders] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Set to false initially, only load on expand
    const [isDragging, setIsDragging] = useState(false);
    const [hasSubfolders, setHasSubfolders] = useState(false);

    const isSpecialSection = path === 'trash' || path === 'shared-with-me';

    const fetchContents = useCallback(async () => {
        if (isSpecialSection) {
            setSubfolders([]); // Special sections don't have browsable subfolders in this context
            setHasSubfolders(false);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await browseFiles(path);
            const folders = res.data.filter(item => item.type === 'dir');
            setSubfolders(folders);
            setHasSubfolders(folders.length > 0);
        } catch (err) {
            console.error(`Failed to fetch contents for ${path}:`, err);
            setHasSubfolders(false);
        } finally {
            setIsLoading(false);
        }
    }, [path, isSpecialSection]);

    useEffect(() => {
        // Only fetch contents for regular folders on initial render if not collapsed
        if (!isCollapsed && !isSpecialSection) {
            fetchContents();
        }
    }, [fetchContents, isCollapsed, isSpecialSection]);

    const handleToggleExpand = (e) => {
        e.stopPropagation();
        if (isCollapsed || isSpecialSection) return;
        setIsExpanded(!isExpanded);
        if (!isExpanded && subfolders.length === 0) { // Fetch subfolders only when expanding for the first time
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
        if (isSpecialSection) {
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
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${isExpanded && !isCollapsed && !isSpecialSection ? 'shadow-neo-inset' : 'hover:shadow-neo-inset'}`}
            >
                <Icon size={20} className="text-gray-300" />
                {!isCollapsed && (
                    <>
                        <span className="ml-4 font-semibold flex-grow text-gray-200">{name}</span>
                        {hasSubfolders && !isSpecialSection && (
                            <button onClick={handleToggleExpand} className="p-1 rounded-full hover:bg-gray-500/20">
                                <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                        )}
                    </>
                )}
            </div>
            {!isCollapsed && isExpanded && !isSpecialSection && (
                <div className="pl-8 py-1 space-y-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 p-2 text-sm text-gray-400">
                            <Loader size={16} className="animate-spin" /> Loading...
                        </div>
                    ) : subfolders.length > 0 ? subfolders.map(item => (
                        <div key={item.name} className="flex items-center gap-2 p-2 text-sm text-gray-200">
                            <Folder size={16} />
                            <span className="truncate">{item.name}</span>
                        </div>
                    )) : (
                        <p className="p-2 text-xs text-gray-400">No subfolders</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SidebarItem;