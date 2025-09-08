"use client";

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

const AddUserForm = ({ onCreateUser, onCancel, isLoading: parentLoading }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEmail || !newPassword || !newFirstName || !newLastName) {
      setError("All fields are required.");
      return;
    }
    setIsSubmitting(true);
    const result = await onCreateUser({
      email: newEmail,
      password: newPassword,
      role: newRole,
      first_name: newFirstName,
      last_name: newLastName
    });
    setIsSubmitting(false);

    if (result.success) {
      setNewEmail('');
      setNewPassword('');
      setNewFirstName('');
      setNewLastName('');
      setNewRole('user');
      onCancel(); // Close the form on success
    } else {
      setError(result.error);
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const isDisabled = parentLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg shadow-neo-inset">
      <h4 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <UserPlus size={18} /> Add New User
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">First Name</label>
          <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className={inputStyles} required disabled={isDisabled} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Last Name</label>
          <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className={inputStyles} required disabled={isDisabled} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className={inputStyles}
          required
          disabled={isDisabled}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-400">Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputStyles}
          required
          disabled={isDisabled}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-400">Role</label>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className={inputStyles}
          disabled={isDisabled}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <div className="flex justify-end gap-4">
        <button type="button" onClick={() => { onCancel(); setError(''); }} className={secondaryButtonStyles} disabled={isDisabled}>Cancel</button>
        <button type="submit" disabled={isDisabled} className={primaryButtonStyles}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default AddUserForm;