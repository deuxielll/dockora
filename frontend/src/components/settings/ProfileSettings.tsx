import React, { useState, useEffect, useRef } from 'react';
import { changePassword, updateCurrentUserProfile, uploadAvatar } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Edit, ChevronDown } from 'lucide-react';
import SettingsCard from './SettingsCard';

const ProfileSettings = () => {
  const { currentUser, verifyAuth } = useAuth();

  // Profile state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const avatarInputRef = useRef(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isPasswordSectionVisible, setIsPasswordSectionVisible] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || '');
      setFirstName(currentUser.first_name || '');
      setLastName(currentUser.last_name || '');
      setAvatarPreview(currentUser.avatar_url ? `http://${window.location.hostname}:5000${currentUser.avatar_url}` : null);
    }
  }, [currentUser]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsProfileLoading(true);
    try {
      const res = await updateCurrentUserProfile({ email, first_name: firstName, last_name: lastName });
      setProfileSuccess(res.data.message || "Profile updated successfully!");
      await verifyAuth();
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append('file', file);
      try {
        await uploadAvatar(formData);
        await verifyAuth();
        setProfileSuccess("Avatar updated successfully!");
        setTimeout(() => setProfileSuccess(''), 3000);
      } catch (err) {
        setProfileError(err.response?.data?.error || 'Failed to upload avatar.');
        setAvatarPreview(currentUser.avatar_url ? `http://${window.location.hostname}:5000${currentUser.avatar_url}` : null);
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 1) {
      setPasswordError("New password cannot be empty.");
      return;
    }
    setIsPasswordLoading(true);
    try {
      const res = await changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordSuccess(res.data.message || "Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const buttonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <SettingsCard title="Profile">
      <form onSubmit={handleProfileSubmit}>
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <img
              src={avatarPreview || `https://ui-avatars.com/api/?name=${firstName || currentUser?.username}&background=1e1e1e&color=d1d5db&bold=true`}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover shadow-neo"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit size={24} className="text-white" />
            </button>
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            className="hidden"
            accept="image/png, image/jpeg, image/gif"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-gray-400">First Name</label>
                <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputStyles} />
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-gray-400">Last Name</label>
                <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputStyles} />
            </div>
        </div>
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-400">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyles} placeholder="user@example.com" />
        </div>
        {profileError && <p className="text-red-500 text-sm mb-4 text-center">{profileError}</p>}
        {profileSuccess && <p className="text-green-600 text-sm mb-4 text-center">{profileSuccess}</p>}
        <div className="flex justify-end">
          <button type="submit" className={buttonStyles} disabled={isProfileLoading || (currentUser && email === (currentUser.email || '') && firstName === (currentUser.first_name || '') && lastName === (currentUser.last_name || ''))}>
            {isProfileLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <hr className="my-8 border-gray-700/50" />

      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsPasswordSectionVisible(!isPasswordSectionVisible)}
        aria-expanded={isPasswordSectionVisible}
      >
        <h3 className="text-xl font-semibold text-gray-200">Change Password</h3>
        <button
          type="button"
          className="p-2 rounded-full hover:shadow-neo-inset transition-all"
        >
          <ChevronDown
            size={20}
            className={`transition-transform duration-300 ${isPasswordSectionVisible ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isPasswordSectionVisible && (
        <form onSubmit={handlePasswordSubmit} className="mt-6">
          <div className="mb-4">
            <label htmlFor="currentPassword"_ className="block text-sm font-medium mb-2 text-gray-400">Current Password</label>
            <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputStyles} required />
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium mb-2 text-gray-400">New Password</label>
            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputStyles} required />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-gray-400">Confirm New Password</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputStyles} required />
          </div>
          {passwordError && <p className="text-red-500 text-sm mb-4 text-center">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm mb-4 text-center">{passwordSuccess}</p>}
          <div className="flex justify-end">
            <button type="submit" className={buttonStyles} disabled={isPasswordLoading}>
              {isPasswordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
};

export default ProfileSettings;