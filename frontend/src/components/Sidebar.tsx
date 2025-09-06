import React, { useState } from 'react';
import { ChevronLeft, Video, Music, FileText, Download, Image as GalleryIcon, Trash2, Users, Share2 } from 'lucide-react';
import SidebarItem from './SidebarItem';

const Sidebar = ({ onNavigate, currentUser }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Paths are now relative to the user's home directory, which the backend resolves.
    const sections = [
        { name: 'Videos', icon: Video, path: '/Videos' },
        { name: 'Music', icon: Music, path: '/Music' },
        { name: 'Documents', icon: FileText, path: '/Documents' },
        { name: 'Downloads', icon: Download, path: '/Downloads' },
        { name: 'Gallery', icon: GalleryIcon, path: '/Gallery' },
    ];

    const specialSections = [
        { name: 'Shared with me', icon: Users, path: 'shared-with-me' },
        { name: 'My Shares', icon: Share2, path: 'my-shares' },
        { name: 'Trash', icon: Trash2, path: 'trash' },
    ];

    const panelClasses = "bg-dark-bg shadow-neo";

    return (
        <div className={`hidden md:flex flex-col h-full p-4 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${panelClasses} rounded-xl`}>
            <div className="flex items-center justify-between mb-6">
                {!isCollapsed && <h2 className="font-bold text-xl text-gray-200">Files</h2>}
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
                    <ChevronLeft size={20} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <nav className="flex-grow space-y-2">
                {sections.map(section => (
                    <SidebarItem 
                        key={section.name}
                        name={section.name}
                        icon={section.icon}
                        path={section.path}
                        isCollapsed={isCollapsed}
                        onNavigate={onNavigate}
                        depth={0} // Pass initial depth
                    />
                ))}
            </nav>

            <div className="mt-auto pt-4 border-t border-gray-700/50">
                {specialSections.map(section => (
                     <div
                        key={section.path}
                        onClick={() => onNavigate(section.path)}
                        title={section.name}
                        className="flex items-center p-3 rounded-lg cursor-pointer hover:shadow-neo-inset"
                    >
                        <section.icon size={20} className="text-gray-300" />
                        {!isCollapsed && <span className="ml-4 font-semibold text-gray-200">{section.name}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;