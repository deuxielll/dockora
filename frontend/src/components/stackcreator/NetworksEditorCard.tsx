import React from 'react';
import KeyValueEditor from './KeyValueEditor';

const NetworksEditorCard = ({ networks, setNetworks, disabled, className = '' }) => {
  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`p-6 rounded-xl ${panelClasses} ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-200">Networks</h3>
      <p className="text-sm text-gray-400 mb-4">Define top-level networks here. You can then assign services to these networks in the service editor.</p>
      <fieldset disabled={disabled}>
        <KeyValueEditor
          items={networks}
          setItems={setNetworks}
          placeholder="e.g., media-net"
          title=""
        />
      </fieldset>
    </div>
  );
};

export default NetworksEditorCard;