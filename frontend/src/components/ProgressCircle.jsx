import React from 'react';

const ProgressCircle = ({ size = 48, className = '' }) => {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.5C6.20101 2.5 1.5 7.20101 1.5 13C1.5 18.799 6.20101 23.5 12 23.5C17.799 23.5 22.5 18.799 22.5 13C22.5 11.0435 21.9565 9.16304 20.9501 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ProgressCircle;