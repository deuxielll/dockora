"use client";

import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import WidgetWrapper from '../widgets/WidgetWrapper';
import { WIDGETS_CONFIG } from '../../pages/HomePage'; // Import WIDGETS_CONFIG from HomePage

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetGrid = ({
  layouts,
  handleLayoutChange,
  handleDragResizeStart,
  handleDragResizeStop,
  isLayoutLocked,
  isInteracting,
  visibleWidgets,
  handleHideWidget,
}) => {
  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
      rowHeight={100}
      margin={[24, 24]}
      containerPadding={[0, 0]}
      onLayoutChange={handleLayoutChange}
      onDragStart={handleDragResizeStart}
      onDragStop={handleDragResizeStop}
      onResizeStart={handleDragResizeStart}
      onResizeStop={handleDragResizeStop}
      draggableHandle=".drag-handle"
      isDraggable={!isLayoutLocked}
      isResizable={!isLayoutLocked}
    >
      {visibleWidgets.map(key => {
        const WidgetComponent = WIDGETS_CONFIG[key].component;
        return (
          <div key={key}>
            <WidgetWrapper
              widgetId={key} // Pass widgetId here
              title={WIDGETS_CONFIG[key].title}
              onHide={handleHideWidget}
              isLocked={isLayoutLocked}
              isInteracting={isInteracting}
            >
              <WidgetComponent />
            </WidgetWrapper>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};

export default WidgetGrid;