import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser } from '../services/api';
import { Trash2, UserPlus, Edit } from 'lucide-react';
import EditUserModal from '../components/modals/EditUserModal';
import { useAuth } from '../hooks/useAuth';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const { currentUser } = useAuth();
  const panelClasses = "bg-dark-bg shadow-neo";

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError("Could not load users. You may not have permission to view this section.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEmail || !newPassword || !newFirstName || !newLastName) {
      setError("All fields are required.");
      return;
    }
    setIsLoading(true);
    try {
      await createUser({ email: newEmail, password: newPassword, role: newRole, first_name: newFirstName, last_name: newLastName });
      setNewEmail('');
      setNewPassword('');
      setNewFirstName('');
      setNewLastName('');
      setNewRole('user');
      setIsAdding(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await deleteUser(userId);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.error || "Failed to delete user.");
      }
    }
  };

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <div className={`p-8 rounded-xl ${panelClasses}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-200">User Management</h3>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className={`${secondaryButtonStyles} flex items-center gap-2 text-sm !py-2 !px-4`}>
              <UserPlus size={16} /> Add User
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleCreateUser} className="mb-6 p-4 rounded-lg shadow-neo-inset">
            <h4 className="font-semibold text-gray-200 mb-4">Add New User</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">First Name</label>
                    <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className={inputStyles} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">Last Name</label>
                    <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className={inputStyles} required />
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
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-400">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className={inputStyles}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => { setIsAdding(false); setError(''); }} className={secondaryButtonStyles}>Cancel</button>
              <button type="submit" disabled={isLoading} className={primaryButtonStyles}>
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        {error && !isAdding && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <div className="space-y-3">
          {users.map(user => {
            const isCurrentUser = currentUser && currentUser.id === user.id;
            const isPrimaryAdmin = user.id === 1;
            const canBeModified = !isCurrentUser && !isPrimaryAdmin;
            const displayName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.username;

            return (
              <div key={user.id} className={`flex justify-between items-center p-3 rounded-lg ${panelClasses}`}>
                <div>
                  <span className="font-medium text-gray-200">{displayName}</span>
                  {user.email && <span className="text-sm text-gray-400 ml-2">({user.email})</span>}
                  <span className={`ml-3 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserToEdit(user)}
                    disabled={!canBeModified}
                    className={`${iconButtonStyles} text-blue-600`}
                    title={canBeModified ? `Edit ${user.username}` : "This user cannot be edited."}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    disabled={!canBeModified}
                    className={`${iconButtonStyles} text-red-500`}
                    title={canBeModified ? `Delete ${user.username}` : "This user cannot be deleted."}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {userToEdit && (
        <EditUserModal
          user={userToEdit}
          onClose={() => setUserToEdit(null)}
          onSuccess={() => {
            fetchUsers();
            setUserToEdit(null);
          }}
        />
      )}
    </>
  );
};

export default UserManagement;