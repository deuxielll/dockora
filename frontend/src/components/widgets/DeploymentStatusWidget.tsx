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
    <div className="bg-dark-bg shadow-neo p-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-semibold text-gray-200">{deployment.name}</p>
            <p className="text-sm text-gray-400 capitalize">
              {deployment.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full hover:shadow-neo-inset transition-all"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button
            onClick={() => clearDeployment(deployment.id)}
            className="p-2 rounded-full hover:shadow-neo-inset transition-all text-red-500"
            title="Clear"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <pre className="mt-4 text-xs overflow-y-auto bg-gray-900 p-4 rounded-lg max-h-60 whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar">
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
    <>
      <div className="flex justify-end -mt-2 mb-2">
        <button
          onClick={clearAllDeployments}
          className="flex items-center gap-1 text-sm font-semibold text-red-500 p-2 rounded-lg hover:bg-red-900/30 transition-colors"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 no-scrollbar">
        {deployments.map(d => (
          <DeploymentItem key={d.id} deployment={d} />
        ))}
      </div>
    </>
  );
};

export default DeploymentStatusWidget;