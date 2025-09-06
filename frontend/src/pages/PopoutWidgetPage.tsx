"use client";

import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { WIDGETS_CONFIG } from './HomePage'; // Import WIDGETS_CONFIG
import LoadingSpinner from '../components/LoadingSpinner';
import BackgroundManager from '../components/BackgroundManager'; // To maintain consistent background

const PopoutWidgetPage = () => {
  const { widgetId } = useParams();
  const widgetConfig = WIDGETS_CONFIG[widgetId];

  if (!widgetConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg text-red-500">
        <BackgroundManager />
        <p>Widget not found.</p>
      </div>
    );
  }

  const WidgetComponent = widgetConfig.component;

  return (
    <div className="min-h-screen flex flex-col p-4 bg-dark-bg text-gray-200">
      <BackgroundManager />
      <h1 className="text-xl font-bold mb-4 text-gray-200">{widgetConfig.title}</h1>
      <div className="flex-1 bg-dark-bg-secondary shadow-neo rounded-xl p-4">
        <Suspense fallback={<LoadingSpinner />}>
          <WidgetComponent isInteracting={false} /> {/* Pass isInteracting as false for standalone */}
        </Suspense>
      </div>
    </div>
  );
};

export default PopoutWidgetPage;