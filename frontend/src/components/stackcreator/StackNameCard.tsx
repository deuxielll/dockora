import React from 'react';

const StackNameCard = ({ stackName, setStackName, disabled, className = '' }) => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition";

  return (
    <div className={`p-6 rounded-xl ${panelClasses} ${className}`}>
      <fieldset disabled={disabled}>
        <div>
          <label htmlFor="stack-name" className="block text-lg font-semibold mb-4 text-gray-200">Stack Name</label>
          <input
            id="stack-name"
            type="text"
            value={stackName}
            onChange={(e) => setStackName(e.target.value)}
            className={inputStyles}
            placeholder="my-awesome-app"
            required
          />
        </div>
      </fieldset>
    </div>
  );
};

export default StackNameCard;