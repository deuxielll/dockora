import React, { useState } from 'react';
import { Clock, AlarmClock, Timer, Globe } from 'lucide-react';
import ClockDisplay from '../time-widget/ClockDisplay';
import Alarm from '../time-widget/Alarm';
import TimerComponent from '../time-widget/Timer';
import Stopwatch from '../time-widget/Stopwatch';
import WorldClock from '../time-widget/WorldClock';

const TimeWidget = () => {
  const [activeTab, setActiveTab] = useState('clock');

  const tabs = [
    { id: 'clock', icon: Clock, label: 'Clock' },
    { id: 'alarm', icon: AlarmClock, label: 'Alarm' },
    { id: 'timer', icon: Timer, label: 'Timer' },
    { id: 'stopwatch', icon: Timer, label: 'Stopwatch' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'alarm': return <Alarm />;
      case 'timer': return <TimerComponent />;
      case 'stopwatch': return <Stopwatch />;
      default: return <ClockDisplay />;
    }
  };
  
  const [isWorldClockOpen, setIsWorldClockOpen] = useState(false);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-grow flex flex-col justify-center min-h-0">
        {renderContent()}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-around items-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={`p-3 rounded-full transition-all ${activeTab === tab.id ? 'text-accent shadow-neo-inset' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <tab.icon size={20} />
          </button>
        ))}
        <div 
          className="relative"
          onMouseEnter={() => setIsWorldClockOpen(true)}
          onMouseLeave={() => setIsWorldClockOpen(false)}
        >
            <button
                title="World Clock"
                className={`p-3 rounded-full transition-all text-gray-200 hover:text-gray-200`}
            >
                <Globe size={20} />
            </button>
            {isWorldClockOpen && (
                <div 
                    className="absolute bottom-full right-0 mb-2 w-72 p-4 bg-dark-bg-secondary shadow-neo rounded-lg z-20 h-64"
                >
                    <WorldClock />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TimeWidget;