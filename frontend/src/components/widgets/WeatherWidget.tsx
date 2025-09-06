import React, { useState, useEffect } from 'react';
import { Settings, Sun, Cloud, CloudRain, CloudSnow, Wind, Loader, Zap, CloudFog, Droplets, Umbrella, CloudSun, WifiOff } from 'lucide-react';
import axios from 'axios';
import { useSettings } from '../../hooks/useSettings';

const OwmWeatherIcon = ({ code, ...props }) => {
  if (!code) return <CloudSun {...props} />;
  const main = code.toLowerCase();
  if (main.includes('clear')) return <Sun {...props} className="text-yellow-500" />;
  if (main.includes('clouds')) return <Cloud {...props} className="text-gray-400" />;
  if (main.includes('rain') || main.includes('drizzle') || main.includes('thunderstorm')) return <CloudRain {...props} className="text-blue-500" />;
  if (main.includes('snow')) return <CloudSnow {...props} className="text-blue-200" />;
  if (main.includes('mist') || main.includes('smoke') || main.includes('haze') || main.includes('dust') || main.includes('fog')) return <Wind {...props} className="text-gray-500" />;
  return <CloudSun {...props} className="text-gray-400" />;
};

const MeteoWeatherIcon = ({ code, ...props }) => {
  if (code <= 1) return <Sun {...props} />;
  if (code <= 3) return <Cloud {...props} />;
  if (code <= 48) return <CloudFog {...props} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain {...props} />;
  if (code <= 77 || (code >= 85 && code <= 86)) return <CloudSnow {...props} />;
  if (code >= 95) return <Zap {...props} />;
  return <CloudSun {...props} />;
};

const getWeatherDescription = (code) => {
  const codes = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
  };
  return codes[code] || 'Unknown';
};

const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();
  const apiKey = settings.weatherApiKey;
  const provider = settings.weatherProvider || 'openmeteo';
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (provider === 'openweathermap' && !apiKey) {
      setIsLoading(false);
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err) => {
          setError("Location access denied. Please enable it in your browser settings.");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setIsLoading(false);
    }
  }, [apiKey, provider]);

  useEffect(() => {
    if (!coords) return;
    if (provider === 'openweathermap' && !apiKey) return;

    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (provider === 'openweathermap') {
          const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`);
          setWeatherData({ ...response.data, isOwm: true });
        } else { // openmeteo
          const [weatherRes, geoRes] = await Promise.all([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&forecast_days=7&timezone=auto`),
            axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`)
          ]);
          
          setWeatherData({
              ...weatherRes.data,
              locationName: geoRes.data.city || geoRes.data.locality || 'Unknown Location',
              isOwm: false,
          });
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.code === 'ERR_NETWORK') {
          setError("No internet connection. Could not fetch weather data.");
        } else if (err.response?.status === 401) {
          setError("Invalid API Key.");
        } else {
          setError("Could not fetch weather data.");
        }
        console.error("Weather fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [apiKey, coords, provider]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-grow flex items-center justify-center"><Loader className="animate-spin text-blue-500" /></div>;
    }
    if (error && error.includes("No internet connection")) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-red-500 p-4">
          <WifiOff size={48} className="mb-4" />
          <p className="font-bold text-lg">No Internet Connection</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      );
    }
    if (provider === 'openweathermap' && !apiKey) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-2">
          <Settings size={48} className="text-gray-400 mb-4" />
          <p className="font-semibold text-gray-200">Weather Widget</p>
          <p className="text-sm text-gray-400">API key setup is required in Settings.</p>
        </div>
      );
    }
    if (error) {
      return <div className="flex-grow flex items-center justify-center text-center text-red-500 text-sm">{error}</div>;
    }
    if (weatherData) {
      if (weatherData.isOwm) {
        return (
          <div className="flex-grow flex items-center justify-center text-center">
            <div className="flex items-center gap-4">
              <OwmWeatherIcon code={weatherData.weather[0].main} size={48} />
              <div>
                <p className="text-4xl font-bold text-gray-200 text-shadow-neo">{Math.round(weatherData.main.temp)}°C</p>
                <p className="text-sm text-gray-400 capitalize">{weatherData.weather[0].description}</p>
              </div>
            </div>
          </div>
        );
      }

      const { current, daily } = weatherData;
      return (
        <div className="flex-grow flex flex-col text-center overflow-y-auto no-scrollbar pr-2">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="text-yellow-400">
              <MeteoWeatherIcon code={current.weathercode} size={48} />
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-200 text-shadow-neo">{Math.round(current.temperature_2m)}°C</p>
              <p className="text-sm text-gray-400 capitalize">
                {getWeatherDescription(current.weathercode)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Feels like {Math.round(current.apparent_temperature)}°C</p>

          <div className="grid grid-cols-4 gap-2 text-xs mb-4">
            <div className="flex flex-col items-center">
              <Droplets size={16} className="text-blue-400 mb-1" />
              <span className="text-gray-200">{current.relativehumidity_2m}%</span>
              <span className="text-gray-400">Humidity</span>
            </div>
            <div className="flex flex-col items-center">
              <Wind size={16} className="text-gray-400 mb-1" />
              <span className="text-gray-200">{Math.round(current.windspeed_10m)} km/h</span>
              <span className="text-gray-400">Wind</span>
            </div>
            <div className="flex flex-col items-center">
              <Umbrella size={16} className="text-cyan-400 mb-1" />
              <span className="text-gray-200">{current.precipitation} mm</span>
              <span className="text-gray-400">Precip.</span>
            </div>
            <div className="flex flex-col items-center">
              <Sun size={16} className="text-yellow-400 mb-1" />
              <span className="text-gray-200">{Math.round(current.uv_index)}</span>
              <span className="text-gray-400">UV Index</span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {daily.time.slice(1).map((date, index) => {
              const i = index + 1;
              const precipSum = daily.precipitation_sum[i];
              const snowSum = daily.snowfall_sum[i];
              
              return (
                <div key={date} className="flex justify-between items-center">
                  <span className="font-semibold w-10 text-left text-gray-200">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  
                  <div className="flex items-center gap-2 text-cyan-400 w-20 justify-center">
                    {snowSum > 0 ? (
                      <>
                        <CloudSnow size={16} />
                        <span className="text-gray-200">{snowSum.toFixed(1)} cm</span>
                      </>
                    ) : precipSum > 0 ? (
                      <>
                        <CloudRain size={16} />
                        <span className="text-gray-200">{precipSum.toFixed(1)} mm</span>
                      </>
                    ) : (
                      <span className="w-16 h-4"></span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-yellow-400">
                      <MeteoWeatherIcon code={daily.weathercode[i]} size={24} />
                    </div>
                    <span className="text-gray-200 w-8 text-right">{Math.round(daily.temperature_2m_min[i])}°</span>
                    <span className="text-gray-200">/</span>
                    <span className="font-semibold w-8 text-right text-gray-200">{Math.round(daily.temperature_2m_max[i])}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return <div className="flex-grow flex items-center justify-center text-center text-sm text-gray-500">Waiting for location...</div>;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end text-gray-200 -mt-2 mb-2 flex-shrink-0">
        <p className="text-sm font-semibold">{weatherData?.isOwm ? weatherData.name : weatherData?.locationName}</p>
      </div>
      {renderContent()}
    </div>
  );
};

export default WeatherWidget;