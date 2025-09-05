import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Folder, Loader } from 'lucide-react';
import { browseFiles, uploadFile } from '../services/api';

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subfolders, setSubfolders] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Loading on mount
    const [isDragging, setIsDragging] = useState(false);
    const [hasSubfolders, setHasSubfolders] = useState(false);

    const fetchContents = useCallback(async () => {
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
    }, [path]);

    useEffect(() => {
        fetchContents();
    }, [fetchContents]);

    const handleToggleExpand = (e) => {
        e.stopPropagation();
        if (isCollapsed) return;
        setIsExpanded(!isExpanded);
    };

    const handleNavigate = () => {
        onNavigate(path);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
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
            } catch (err) {
                alert(err.response?.data?.error || 'An error occurred during upload.');
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
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${isExpanded && !isCollapsed ? 'shadow-neo-inset' : 'hover:shadow-neo-inset'}`}
            >
                <Icon size={20} className="text-gray-300" />
                {!isCollapsed && (
                    <>
                        <span className="ml-4 font-semibold flex-grow">{name}</span>
                        {isLoading ? (
                            <div className="p-1">
                                <Loader size={16} className="animate-spin" />
                            </div>
                        ) : hasSubfolders && (
                            <button onClick={handleToggleExpand} className="p-1 rounded-full hover:bg-gray-500/20">
                                <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                        )}
                    </>
                )}
            </div>
            {!isCollapsed && isExpanded && (
                <div className="pl-8 py-1 space-y-1">
                    {subfolders.length > 0 ? subfolders.map(item => (
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