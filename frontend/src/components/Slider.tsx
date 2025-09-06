import React from 'react';
import { X } from 'lucide-react';

const Slider = ({ label, value, onChange, min, max, step, unit = '', placeholder = '', onClear }) => {
  const sliderTrackStyles = "w-full h-2 bg-dark-bg rounded-full shadow-neo-inset appearance-none cursor-pointer";

  // Calculate fill percentage for the track
  const fillPercentage = value === '' || isNaN(value) ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-400 flex items-center gap-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value === '' || isNaN(value) ? min : value} // Default to min if value is empty/invalid for slider display
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={sliderTrackStyles}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${fillPercentage}%, #252526 ${fillPercentage}%, #252526 100%)`
          }}
        />
        <input
          type="text" // Keep as text to allow flexible input like "1.5" or "2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 p-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset text-center font-mono text-sm"
          placeholder={placeholder}
        />
        {unit && <span className="text-gray-300 text-sm">{unit}</span>}
        {onClear && value !== '' && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all text-red-500"
            title="Clear limit"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Slider;