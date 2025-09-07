"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import UserManagement from './UserManagementPage';
import ProfileSettings from '../components/settings/ProfileSettings';
import GeneralWidgetSettings from '../components/settings/GeneralWidgetSettings';
import WeatherWidgetSettings from '../components/settings/WeatherWidgetSettings';
import SystemLogsWidgetSettings from '../components/settings/SystemLogsWidgetSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import TrashSettings from '../components/settings/TrashSettings';
import SmtpSettings from '../components/settings/SmtpSettings';
import SshTerminalSettings from '../components/settings/SshTerminalSettings';
import SshTerminalOutputCard from '../components/settings/SshTerminalOutputCard';
import AlarmSettings from '../components/settings/AlarmSettings';
import DownloadClientSettings from '../components/settings/DownloadClientSettings'; // New import
import SettingsSidebar from '../components/settings/SettingsSidebar';

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile'); // Default active section

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'widgets-general':
        return <GeneralWidgetSettings />;
      case 'widgets-weather':
        return <WeatherWidgetSettings />;
      case 'widgets-system-logs':
        return <SystemLogsWidgetSettings />;
      case 'widgets-alarm':
        return <AlarmSettings />;
      case 'system-trash':
        return <TrashSettings />;
      case 'system-smtp':
        return <SmtpSettings />;
      case 'system-ssh-terminal':
        return (
          <>
            <SshTerminalSettings />
            <SshTerminalOutputCard />
          </>
        );
      case 'system-download-client': // New case
        return <DownloadClientSettings />;
      case 'user-management':
        return <UserManagement />;
      default:
        return <ProfileSettings />; // Fallback
    }
  };

  return (
    <div className="flex gap-8 h-full">
      <SettingsSidebar activeSection={activeSection} onNavigate={setActiveSection} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
        <h2 className="sr-only">Settings Content</h2>
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default SettingsPage;