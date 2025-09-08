"use client";

import React from 'react';
import { Trash2, Edit } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

const UserList = ({ users, currentUser, onDeleteUser, onEditUser, isLoading, error }) => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  if (isLoading) {
    return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  if (error) {
    return <p className="text-red-500 text-sm mb-4 text-center">{error}</p>;
  }

  if (users.length === 0) {
    return <p className="text-center text-gray-400 py-8">No users found.</p>;
  }

  return (
    <div className="space-y-3">
      {users.map(user => {
        const isCurrentUser = currentUser && currentUser.id === user.id;
        const isPrimaryAdmin = user.id === 1;
        const canBeModified = !isCurrentUser && !isPrimaryAdmin;
        const displayName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.username;

        return (
          <div key={user.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-lg ${panelClasses}`}>
            <div>
              <span className="font-medium text-gray-200">{displayName}</span>
              {user.email && <span className="text-sm text-gray-400 ml-2">({user.email})</span>}
              <span className={`ml-3 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                {user.role}
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => onEditUser(user)}
                disabled={!canBeModified}
                className={`${iconButtonStyles} text-blue-600`}
                title={canBeModified ? `Edit ${user.username}` : "This user cannot be edited."}
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDeleteUser(user.id, user.username)}
                disabled={!canBeModified}
                className={`${iconButtonStyles} text-red-500`}
                title={canBeModified ? `Delete ${user.username}` : "This user cannot be deleted."}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserList;