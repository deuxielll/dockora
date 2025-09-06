"use client";

import React from 'react';
import LogModal from '../modals/LogModal';
import RenameContainerModal from '../modals/RenameContainerModal';
import EditContainerResourcesModal from '../modals/EditContainerResourcesModal';

const ContainerModals = ({
  selectedContainer,
  logs,
  containerToRename,
  containerToEdit,
  setSelectedContainer,
  setContainerToRename,
  setContainerToEdit,
  fetchContainers,
}) => {
  return (
    <>
      {containerToEdit && (
        <EditContainerResourcesModal
          container={containerToEdit}
          onClose={() => setContainerToEdit(null)}
          onSuccess={() => {
            fetchContainers();
            setContainerToEdit(null);
          }}
        />
      )}
      {containerToRename && (
        <RenameContainerModal 
          container={containerToRename}
          onClose={() => setContainerToRename(null)}
          onSuccess={fetchContainers}
        />
      )}
      {selectedContainer && (
        <LogModal 
          container={selectedContainer} 
          logs={logs} 
          onClose={() => setSelectedContainer(null)} 
        />
      )}
    </>
  );
};

export default ContainerModals;