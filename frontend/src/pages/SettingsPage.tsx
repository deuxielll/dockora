import React from 'react';
import { useAuth } from '../hooks/useAuth';
import UserManagement from './UserManagementPage';
import ProfileSettings from '../components/settings/ProfileSettings';
import WidgetSettings from '../components/settings/WidgetSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import TrashSettings from '../components/settings/TrashSettings';
import SmtpSettings from '../components/settings/SmtpSettings';
import SshTerminalSettings from '../components/settings/SshTerminalSettings'; // New import

const SettingsPage = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-200">Settings</h2>
      <div className="columns-1 md:columns-2 xl:columns-3 gap-8">
        <ProfileSettings />
        <AppearanceSettings />
        <WidgetSettings />
        <TrashSettings />

        {currentUser && currentUser.role === 'admin' && (
          <>
            <SmtpSettings />
            <SshTerminalSettings /> {/* New component */}
            <div className="break-inside-avoid mb-8">
              <UserManagement />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;