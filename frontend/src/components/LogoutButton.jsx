import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LogoutButton = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="p-3 bg-dark-bg text-gray-300 rounded-full shadow-neo active:shadow-neo-inset transition-all"
      title="Logout"
    >
      <LogOut size={20} />
    </button>
  );
};

export default LogoutButton;