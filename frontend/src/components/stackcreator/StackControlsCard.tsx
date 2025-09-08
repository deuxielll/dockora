import React from 'react';

const StackControlsCard = ({
  editorMode,
  handleTabSwitch,
  deploymentId,
  isDeploying,
  isFinished,
  deployment,
  onCancel,
  onDeploy,
  onSuccess,
  setError, // Passed down to handle potential errors from buttons
  className = ''
}) => {
  const panelClasses = "bg-dark-bg shadow-neo";
  const primaryButtonStyles = "px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "px-6 py-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  const TabButton = ({ active, onClick, children, disabled = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${
        active
          ? "text-accent shadow-neo-inset"
          : "text-gray-200 bg-dark-bg shadow-neo hover:shadow-neo-inset"
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none`}
    >
      {children}
    </button>
  );

  return (
    <div className={`p-6 rounded-xl ${panelClasses} flex-shrink-0 ${className}`}>
      <div className="flex flex-wrap justify-between items-center gap-y-4">
        <div className="flex gap-2">
          <TabButton active={editorMode === 'visual'} onClick={() => handleTabSwitch('visual')} disabled={deploymentId !== null}>Visual Editor</TabButton>
          <TabButton active={editorMode === 'yaml'} onClick={() => handleTabSwitch('yaml')} disabled={deploymentId !== null}>Paste YAML</TabButton>
        </div>
        <div className="flex gap-4">
          {isFinished ? (
            deployment.status === 'success' ? (
              <>
                <button onClick={() => { setError(''); onDeploy(null); }} className={secondaryButtonStyles}>Edit & Deploy Again</button>
                <button onClick={onSuccess} className={primaryButtonStyles}>Finish</button>
              </>
            ) : ( // status === 'error'
              <>
                <button onClick={onSuccess} className={secondaryButtonStyles}>Close</button>
                <button onClick={() => { setError(''); onDeploy(null); }} className={primaryButtonStyles}>Edit & Deploy Again</button>
              </>
            )
          ) : (
            <>
              <button onClick={onCancel} disabled={isDeploying} className={secondaryButtonStyles}>Cancel</button>
              <button onClick={onDeploy} disabled={isDeploying || deploymentId !== null} className={primaryButtonStyles}>
                {isDeploying ? 'Deploying...' : 'Deploy Stack'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StackControlsCard;