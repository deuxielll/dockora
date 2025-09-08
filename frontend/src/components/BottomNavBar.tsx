import React from 'react';
import { Home, Container, Settings } from 'lucide-react'; // Removed Folder icon
import { useNavigate } from 'react-router-dom';

const BottomNavBar = ({ activeTab, currentUser }) => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const navigate = useNavigate();

  const baseNavItems = [
    { name: 'home', label: 'Home', icon: Home, path: '/' },
    { name: 'containers', label: 'Containers', icon: Container, path: '/containers' },
    // Removed File Manager item
    { name: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const navItems = currentUser && currentUser.role !== 'admin'
    ? baseNavItems.filter(item => item.name !== 'containers')
    : baseNavItems;

  const NavButton = ({ itemName, itemLabel, ItemIcon, isActive, path }) => (
    <button
      onClick={() => navigate(path)}
      title={itemLabel}
      className={`flex items-center justify-center w-16 h-16 transition-all duration-300 rounded-lg p-2 focus:outline-none ${
        isActive
          ? "text-accent shadow-neo-inset"
          : "text-gray-300 hover:shadow-neo"
      }`}
    >
      <ItemIcon size={28} />
    </button>
  );

  return (
    <div className={`group fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-max transition-transform duration-300 ease-in-out transform md:translate-y-[calc(100%-2rem)] md:hover:translate-y-0`}>
      <div className="p-4 pt-6">
        <nav className={`relative flex justify-center items-center p-2 gap-2 rounded-xl ${panelClasses}`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-600 rounded-full transition-opacity duration-300 hidden md:block md:group-hover:opacity-0" />
          {navItems.map(item => (
            <NavButton
              key={item.name}
              itemName={item.name}
              itemLabel={item.label}
              ItemIcon={item.icon}
              isActive={activeTab === item.name}
              path={item.path}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

export default BottomNavBar;