import React from 'react';
import ServiceEditor from './ServiceEditor';
import SimpleCodeEditor from '../SimpleCodeEditor';
import { Plus } from 'lucide-react';

const ServicesEditorCard = ({
  services,
  updateService,
  removeService,
  addService,
  editorMode,
  rawYaml,
  setRawYaml,
  disabled,
  className = '',
}) => {
  // Removed panelClasses as the outer div will no longer be a distinct card
  // const panelClasses = "bg-dark-bg shadow-neo"; 

  return (
    // Removed p-6 rounded-xl ${panelClasses} from the outer div
    <div className={`flex-1 flex flex-col ${className}`}>
      <fieldset disabled={disabled} className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        {editorMode === 'visual' ? (
          <> {/* Using a React Fragment to group elements without an extra div */}
            <div className="space-y-6">
              {services.map(service => (
                <ServiceEditor
                  key={service.id}
                  service={service}
                  updateService={updateService}
                  removeService={removeService}
                />
              ))}
            </div>
            <button onClick={addService} className="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-dark-bg text-gray-300 shadow-neo active:shadow-neo-inset">
              <Plus size={16} /> Add Service
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <label htmlFor="yaml-input" className="block text-lg font-semibold mb-4 text-gray-200">Paste docker-compose.yml</label>
            <SimpleCodeEditor
              value={rawYaml}
              onChange={(e) => setRawYaml(e.target.value)}
            />
          </div>
        )}
      </fieldset>
    </div>
  );
};

export default ServicesEditorCard;