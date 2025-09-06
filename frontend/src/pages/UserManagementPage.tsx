"use client";

import React, { useState } from 'react';
import EditUserModal from '../components/modals/EditUserModal';
import { useAuth } from '../hooks/useAuth';
import useUserManagement from '../hooks/useUserManagement'; // New import
import AddUserForm from '../components/user-management/AddUserForm'; // New import
import UserList from '../components/user-management/UserList'; // New import
import { UserPlus } from 'lucide-react';

const UserManagementPage = () => {
  const { currentUser } = useAuth();
  const {
    users,
    isLoading,
    error,
    fetchUsers,
    handleCreateUser,
    handleDeleteUser,
    handleUpdateUser,
  } = useUserManagement(); // Use the new hook

  const [isAdding, setIsAdding] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const panelClasses = "bg-dark-bg shadow-neo";

  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

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
          <AddUserForm
            onCreateUser={handleCreateUser}
            onCancel={() => setIsAdding(false)}
            isLoading={isLoading}
          />
        )}

        <UserList
          users={users}
          currentUser={currentUser}
          onDeleteUser={handleDeleteUser}
          onEditUser={setUserToEdit}
          isLoading={isLoading}
          error={error}
        />
      </div>
      {userToEdit && (
        <EditUserModal
          user={userToEdit}
          onClose={() => setUserToEdit(null)}
          onSuccess={() => {
            handleUpdateUser(userToEdit.id, userToEdit); // Trigger update via hook
            setUserToEdit(null);
          }}
        />
      )}
    </>
  );
};

export default UserManagementPage;