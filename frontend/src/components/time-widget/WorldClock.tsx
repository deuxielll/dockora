import React, { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useInterval } from '../../hooks/useInterval';
import { Plus, Trash2 } from 'lucide-react';

const allTimezones = Intl.supportedValuesOf('timeZone');

const WorldClock = () => {
  const [clocks, setClocks] = useLocalStorage('dockora-worldclocks', ['America/New_York', 'Europe/London', 'Asia/Tokyo']);
  const [time, setTime] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  useInterval(() => setTime(new Date()), 1000);

  const addClock = (tz) => {
    if (!clocks.includes(tz)) {
      setClocks([...clocks, tz]);
    }
    setShowAdd(false);
    setSearch('');
  };

  const removeClock = (tz) => {
    setClocks(clocks.filter(c => c !== tz));
  };

  const filteredTimezones = search
    ? allTimezones.filter(tz => tz.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-200">World Clock</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset text-gray-200"><Plus size={16} /></button>
      </div>
      {showAdd && (
        <div className="mb-2 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for a city or region..."
            className="w-full p-2 bg-dark-bg rounded-lg shadow-neo-inset text-gray-200 placeholder:text-gray-400"
          />
          {search && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-dark-bg-secondary shadow-neo rounded-lg max-h-32 overflow-y-auto no-scrollbar">
              {filteredTimezones.slice(0, 50).map(tz => (
                <button key={tz} onClick={() => addClock(tz)} className="block w-full text-left p-2 text-sm hover:bg-dark-bg hover:shadow-neo-inset rounded-md text-gray-200">
                  {tz.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex-grow overflow-y-auto space-y-2 pr-1 no-scrollbar">
        {clocks.map(tz => (
          <div key={tz} className="flex items-center justify-between p-2 rounded-lg">
            <div>
              <p className="text-sm text-gray-200">{tz.split('/').pop().replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-200">{tz.split('/')[0].replace(/_/g, ' ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-gray-200">
                {time.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              <button onClick={() => removeClock(tz)} className="text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldClock;