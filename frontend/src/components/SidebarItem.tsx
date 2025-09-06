import React, { useState, useCallback } from 'react';
import { Folder } from 'lucide-react';
import { uploadFile } from '../services/api';
import toast from 'react-hot-toast'; // Import toast for notifications

const SidebarItem = ({ name, icon: Icon, path, isCollapsed, onNavigate, depth = 0 }) => {
    const [isDragging, setIsDragging] = useState(false);

    const isSpecialSection = path === 'trash' || path === 'shared-with-me' || path === 'my-shares';

    // Removed fetchContents, useEffect, isExpanded, subItems, isLoading, hasChildren states and related logic

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
                // No need to call fetchContents here as subfolders are not displayed
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
            {/* Removed conditional rendering for sub-items */}
        </div>
    );
};

export default SidebarItem;