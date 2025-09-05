import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader size={size} className="animate-spin text-accent" />
    </div>
  );
};

export default LoadingSpinner;