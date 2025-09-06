import React from 'react';

const SettingsCard = ({ title, children }) => {
  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`p-8 rounded-xl ${panelClasses} break-inside-avoid mb-8`}>
      <h3 className="text-xl font-semibold mb-6 text-gray-200">{title}</h3>
      {children}
    </div>
  );
};

export default SettingsCard;