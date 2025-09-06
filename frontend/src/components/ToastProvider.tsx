import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster
      position="bottom-center"
      containerStyle={{
        bottom: '8.5rem', // Position above the fully extended navbar (approx 7.5rem height + 1rem margin)
        zIndex: 60, // Ensure it's above the navbar (z-50)
      }}
      toastOptions={{
        style: {
          background: '#1e1e1e',
          color: '#d1d5db',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.05)',
          borderRadius: '12px',
        },
        success: {
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#1e1e1e',
          },
        },
        error: {
          iconTheme: {
            primary: '#f87171',
            secondary: '#1e1e1e',
          },
        },
      }}
    />
  );
};

export default ToastProvider;