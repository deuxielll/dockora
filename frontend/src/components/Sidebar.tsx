import React, { useState } from 'react';
import { ChevronLeft, Video, Music, FileText, Download, Image as GalleryIcon, Trash2 } from 'lucide-react';
import SidebarItem from './SidebarItem';

const Sidebar = ({ onNavigate, currentUser }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const basePath = currentUser.role === 'admin' ? `/data/home/${currentUser.username}` : '';

    const sections = [
        { name: 'Videos', icon: Video, path: `${basePath}/Videos` },
        { name: 'Music', icon: Music, path: `${basePath}/Music` },
        { name: 'Documents', icon: FileText, path: `${basePath}/Documents` },
        { name: 'Downloads', icon: Download, path: `${basePath}/Downloads` },
        { name: 'Gallery', icon: GalleryIcon, path: `${basePath}/Gallery` },
    ];

    const specialSections = [
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