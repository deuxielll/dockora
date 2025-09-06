import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import MiniContainerCard from './MiniContainerCard';

const StackCard = ({ stackName, containers, onAction, onViewLogs, onRenameContainer, onEditContainerResources, actionLoadingStates }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const panelClasses = "bg-dark-bg shadow-neo";

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`p-5 rounded-xl ${panelClasses}`}>
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-gray-300" />
          <h3 className="font-bold text-xl text-gray-200">{stackName}</h3>
          <span className="text-sm text-gray-400">({containers.length} containers)</span>
        </div>
        <button className="p-2 rounded-full hover:shadow-neo-inset transition-all">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-4">
          {containers.map(container => (
            <MiniContainerCard
              key={container.id}
              container={container}
              onAction={onAction}
              onViewLogs={onViewLogs}
              onRenameContainer={onRenameContainer}
              onEditContainerResources={onEditContainerResources}
              isActionLoading={actionLoadingStates[container.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StackCard;