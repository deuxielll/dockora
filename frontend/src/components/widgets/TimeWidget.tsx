import React, { useState } from 'react';
import { Clock, Timer, Globe } from 'lucide-react';
import ClockDisplay from '../time-widget/ClockDisplay';
import TimerComponent from '../time-widget/Timer';
import Stopwatch from '../time-widget/Stopwatch';
import WorldClock from '../time-widget/WorldClock';
import LoadingSpinner from '../LoadingSpinner';

const TimeWidget = ({ isInteracting }) => {
  const [activeTab, setActiveTab] = useState('clock');

  const tabs = [
    { id: 'clock', icon: Clock, label: 'Clock' },
    { id: 'timer', icon: Timer, label: 'Timer' },
    { id: 'stopwatch', icon: Timer, label: 'Stopwatch' },
  ];

  const renderContent = () => {
    if (isInteracting) {
      return <div className="flex-grow flex items-center justify-center"><LoadingSpinner size={32} /></div>;
    }
    switch (activeTab) {
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
            className={`p-3 rounded-full transition-all ${activeTab === tab.id ? 'text-accent shadow-neo-inset' : 'text-gray-200 hover:text-gray-200'}`}
            disabled={isInteracting}
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
                disabled={isInteracting}
            >
                <Globe size={20} />
            </button>
            {isWorldClockOpen && !isInteracting && (
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