"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import UserManagement from './UserManagementPage';
import ProfileSettings from '../components/settings/ProfileSettings';
import WidgetSettings from '../components/settings/WidgetSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import TrashSettings from '../components/settings/TrashSettings';
import SmtpSettings from '../components/settings/SmtpSettings';
import SshTerminalSettings from '../components/settings/SshTerminalSettings';
import SettingsSidebar from '../components/settings/SettingsSidebar'; // New import

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile'); // Default active section

  // Refs for each section to scroll to
  const sectionRefs = {
    profile: useRef(null),
    appearance: useRef(null),
    'widgets-general': useRef(null),
    'widgets-weather': useRef(null),
    'widgets-download-client': useRef(null),
    'widgets-system-logs': useRef(null),
    'system-trash': useRef(null),
    'system-smtp': useRef(null),
    'system-ssh-terminal': useRef(null),
    'user-management': useRef(null),
  };

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    const ref = sectionRefs[sectionId];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Observe sections to update activeSection based on scroll position
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50% 0px', // Trigger when section is in the middle of the viewport
      threshold: 0.5, // 50% of the section is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    Object.values(sectionRefs).forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      Object.values(sectionRefs).forEach(ref => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []);

  return (
    <div className="flex gap-8 h-full">
      <SettingsSidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <h2 className="sr-only">Settings Content</h2> {/* Hidden title for accessibility */}
        <div className="space-y-8">
          <div id="profile" ref={sectionRefs.profile}><ProfileSettings /></div>
          <div id="appearance" ref={sectionRefs.appearance}><AppearanceSettings /></div>
          <div id="widgets-general" ref={sectionRefs['widgets-general']}><WidgetSettings /></div>
          {/* Weather, Download Client, System Logs settings are part of WidgetSettings,
              but we can use dummy divs or specific sections within WidgetSettings for scrolling */}
          {/* For now, we'll just point to the main WidgetSettings component */}
          {/* <div id="widgets-weather" ref={sectionRefs['widgets-weather']}><WidgetSettings /></div>
          <div id="widgets-download-client" ref={sectionRefs['widgets-download-client']}><WidgetSettings /></div>
          <div id="widgets-system-logs" ref={sectionRefs['widgets-system-logs']}><WidgetSettings /></div> */}
          
          <div id="system-trash" ref={sectionRefs['system-trash']}><TrashSettings /></div>

          {currentUser && currentUser.role === 'admin' && (
            <>
              <div id="system-smtp" ref={sectionRefs['system-smtp']}><SmtpSettings /></div>
              <div id="system-ssh-terminal" ref={sectionRefs['system-ssh-terminal']}><SshTerminalSettings /></div>
              <div id="user-management" ref={sectionRefs['user-management']}><UserManagement /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;