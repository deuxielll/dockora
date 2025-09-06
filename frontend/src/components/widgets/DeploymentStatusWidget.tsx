import React, { useState } from 'react';
import { useDeployment } from '../../hooks/useDeployment';
import { Loader, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';

const DeploymentItem = ({ deployment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { clearDeployment } = useDeployment();

  const getStatusIcon = () => {
    switch (deployment.status) {
      case 'deploying':
        return <Loader size={20} className="animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-dark-bg-secondary shadow-neo-inset p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-semibold text-gray-200 text-sm">{deployment.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {deployment.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-full hover:shadow-neo-inset transition-all"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => clearDeployment(deployment.id)}
            className="p-1 rounded-full hover:shadow-neo-inset transition-all text-red-500"
            title="Clear"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <pre className="mt-3 text-xs overflow-y-auto bg-gray-900 p-3 rounded-lg max-h-32 whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar">
          {deployment.output}
        </pre>
      )}
    </div>
  );
};

const DeploymentStatusWidget = () => {
  const { deployments, clearAllDeployments } = useDeployment();

  if (deployments.length === 0) {
    return (
        <div className="flex-grow flex items-center justify-center text-center text-gray-200">
            <p>No recent deployments.</p>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end -mt-2 mb-2 flex-shrink-0">
        <button
          onClick={clearAllDeployments}
          className="flex items-center gap-1 text-sm font-semibold text-red-500 p-2 rounded-lg hover:bg-red-900/30 transition-colors"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 no-scrollbar">
        {deployments.map(d => (
          <DeploymentItem key={d.id} deployment={d} />
        ))}
      </div>
    </div>
  );
};

export default DeploymentStatusWidget;