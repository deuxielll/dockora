import React from 'react';
import { useSettings } from '../hooks/useSettings';

const BackgroundManager = () => {
  const { settings } = useSettings();
  const backgroundUrl = settings?.backgroundUrl;

  const backgroundStyles = {
    backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <>
      {/* This div handles the background image AND the fallback color */}
      <div 
        id="background-image-div"
        className="fixed top-0 left-0 w-screen h-screen -z-20 bg-dark-bg transition-all duration-500"
        style={backgroundStyles}
      />
      {/* This div is a semi-transparent overlay to ensure text readability, only shown with a background image */}
      {backgroundUrl && (
        <div 
          id="background-overlay-div"
          className="fixed top-0 left-0 w-screen h-screen -z-10 bg-dark-bg/70"
        />
      )}
    </>
  );
};

export default BackgroundManager;