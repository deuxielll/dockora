"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, User, Palette, LayoutGrid, CloudSun, Terminal, Trash2, Mail, Key, Users, Download, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SettingsSidebar = ({ activeSection, onNavigate }) => {
  const { currentUser } = useAuth();
  const [expandedSections, setExpandedSections] = useState(new Set(['widgets', 'system'])); // Expand widgets and system by default

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const NavItem = ({ id, label, Icon, isSubItem = false, hasSubItems = false }) => {
    const isActive = activeSection === id;
    const isExpanded = expandedSections.has(id);

    const baseClasses = "flex items-center w-full text-left rounded-lg transition-all duration-200";
    const activeClasses = "shadow-neo-inset text-accent";
    const inactiveClasses = "text-gray-300 hover:shadow-neo-inset";
    const paddingClasses = isSubItem ? "pl-8 py-2 text-sm" : "pl-4 py-3 font-semibold";

    const handleClick = () => {
      if (hasSubItems) {
        toggleSection(id);
      } else {
        onNavigate(id);
      }
    };

    return (
      <div>
        <button
          onClick={handleClick}
          className={`${baseClasses} ${paddingClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
          {Icon && <Icon size={isSubItem ? 16 : 20} className="mr-3 flex-shrink-0" />}
          <span className="flex-grow">{label}</span>
          {hasSubItems && (
            <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </button>
      </div>
    );
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    {
      id: 'widgets', label: 'Widgets', icon: LayoutGrid,
      subItems: [
        { id: 'widgets-general', label: 'General' },
        { id: 'widgets-weather', label: 'Weather' },
        { id: 'widgets-system-logs', label: 'System Logs' },
        { id: 'widgets-download-client', label: 'Download Client' },
      ]
    },
    {
      id: 'system', label: 'System', icon: Terminal,
      subItems: [
        { id: 'system-smtp', label: 'SMTP' },
        { id: 'system-ssh-terminal', label: 'SSH Terminal' },
      ]
    },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'about', label: 'About', icon: Info },
  ];

  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`md:sticky top-4 md:h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar p-4 rounded-xl ${panelClasses} w-full md:w-64 flex-shrink-0`}>
      <h2 className="text-xl font-bold text-gray-200 mb-6 pl-4">Settings</h2>
      <nav className="space-y-1">
        {sections.map(section => {
          // Admin-only sections
          if (!currentUser || currentUser.role !== 'admin') {
            if (section.id === 'system' || section.id === 'user-management') {
              return null;
            }
            if (section.id === 'widgets' && section.subItems) {
              // Filter out admin-only sub-items for non-admins
              section.subItems = section.subItems.filter(sub => sub.id !== 'widgets-system-logs');
            }
          }

          return (
            <React.Fragment key={section.id}>
              <NavItem
                id={section.id}
                label={section.label}
                Icon={section.icon}
                hasSubItems={!!section.subItems}
                onNavigate={onNavigate}
              />
              {section.subItems && expandedSections.has(section.id) && (
                <div className="space-y-1 mt-1">
                  {section.subItems.map(subItem => (
                    <NavItem
                      key={subItem.id}
                      id={subItem.id}
                      label={subItem.label}
                      Icon={
                        subItem.id === 'widgets-weather' ? CloudSun :
                        subItem.id === 'widgets-system-logs' ? Terminal :
                        subItem.id === 'widgets-download-client' ? Download :
                        subItem.id === 'system-smtp' ? Mail :
                        subItem.id === 'system-ssh-terminal' ? Key :
                        null
                      }
                      isSubItem
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsSidebar;