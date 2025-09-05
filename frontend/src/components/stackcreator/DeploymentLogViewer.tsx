import React, { useRef, useEffect } from 'react';
import { useDeployment } from '../../hooks/useDeployment';
import { Loader, CheckCircle, XCircle, Terminal } from 'lucide-react'; // Added Terminal icon

const DeploymentLogViewer = ({ deploymentId }) => {
  const { deployments } = useDeployment();
  const deployment = deployments.find(d => d.id === deploymentId);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [deployment?.output]);

  const getStatusInfo = () => {
    if (!deployment) {
      return { icon: <Terminal size={20} className="text-gray-400" />, text: 'Awaiting deployment...', color: 'text-gray-400' };
    }
    switch (deployment.status) {
      case 'deploying':
        return { icon: <Loader size={20} className="animate-spin text-blue-500" />, text: 'Deploying...', color: 'text-blue-400' };
      case 'success':
        return { icon: <CheckCircle size={20} className="text-green-500" />, text: 'Deployment Successful', color: 'text-green-400' };
      case 'error':
        return { icon: <XCircle size={20} className="text-red-500" />, text: 'Deployment Failed', color: 'text-red-400' };
      default:
        return { icon: null, text: 'Unknown Status', color: 'text-gray-400' };
    }
  };

  const { icon, text, color } = getStatusInfo();
  const panelClasses = "bg-dark-bg shadow-neo";

  return (
    <div className={`p-6 rounded-xl ${panelClasses} h-full flex flex-col`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-200">Deployment Logs</h3>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <p className={`font-semibold ${color}`}>{text}</p>
      </div>
      <pre
        ref={logContainerRef}
        className="text-xs overflow-y-auto bg-gray-900 p-4 rounded-lg flex-grow whitespace-pre-wrap font-mono text-gray-300 shadow-neo-inset no-scrollbar"
      >
        {deployment ? deployment.output : "Logs will appear here once a deployment starts."}
      </pre>
    </div>
  );
};

export default DeploymentLogViewer;