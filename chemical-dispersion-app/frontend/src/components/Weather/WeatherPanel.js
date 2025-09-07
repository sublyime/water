import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiService } from '../../services/api';
import './WeatherPanel.css';

// Fix for Leaflet default markers
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
function LocationSelector({ onLocationSelect, selectedLocation }) {
  const [clickedPosition, setClickedPosition] = useState(selectedLocation);

  const map = useMapEvents({
    click(e) {
      const newPosition = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setClickedPosition(newPosition);
      if (onLocationSelect) {
        onLocationSelect(newPosition);
      }
    },
  });

  return clickedPosition ? (
    <Marker position={[clickedPosition.lat, clickedPosition.lng]} />
  ) : null;
}

function WeatherPanel() {
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [tidalData, setTidalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState({ lat: 29.7604, lng: -95.3698 }); // Houston default
  const [manualCoords, setManualCoords] = useState({ lat: '29.7604', lng: '-95.3698' });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadWeatherData();
    
    // Set up auto-refresh if enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadWeatherData();
      }, 60000); // Update every minute
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedLocation, autoRefresh]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [currentWeather, weatherForecast, tidal] = await Promise.all([
        apiService.getCurrentWeather(selectedLocation.lat, selectedLocation.lng),
        apiService.getWeatherForecast(selectedLocation.lat, selectedLocation.lng, 72),
        apiService.getTidalData(selectedLocation.lat, selectedLocation.lng)
      ]);
      
      setWeatherData(currentWeather);
      setForecast(weatherForecast);
      setTidalData(tidal);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading weather data:', error);
      setError('Failed to load weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setManualCoords({
      lat: location.lat.toFixed(6),
      lng: location.lng.toFixed(6)
    });
  };

  const handleManualCoordinateChange = (field, value) => {
    setManualCoords(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyManualCoordinates = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    
    setSelectedLocation({ lat, lng });
  };

  const getWindDirection = (degrees) => {
    if (degrees === null || degrees === undefined) return 'Unknown';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWeatherIcon = (conditions) => {
    const condition = conditions?.toLowerCase() || '';
    if (condition.includes('rain') || condition.includes('shower')) return '🌧️';
    if (condition.includes('storm') || condition.includes('thunder')) return '⛈️';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('cloud')) return '☁️';
    if (condition.includes('clear') || condition.includes('sunny')) return '☀️';
    if (condition.includes('partly')) return '⛅';
    if (condition.includes('fog') || condition.includes('mist')) return '🌫️';
    return '🌤️';
  };

  const getCurrentConditionClass = (temp) => {
    if (temp === null || temp === undefined) return 'neutral';
    if (temp > 85) return 'hot';
    if (temp > 70) return 'warm';
    if (temp > 50) return 'mild';
    if (temp > 32) return 'cool';
    return 'cold';
  };

  if (loading && !weatherData) {
    return (
      <div className="weather-panel-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Loading Weather Data...</h2>
          <p>Fetching current conditions and forecast</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-panel-container">
      {/* Header */}
      <div className="weather-header">
        <div className="header-content">
          <h1>Weather & Environmental Data</h1>
          <p>Real-time weather conditions for spill modeling</p>
        </div>
        <div className="header-controls">
          <div className="auto-refresh-control">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh every minute
            </label>
          </div>
          <button 
            className="btn btn-primary"
            onClick={loadWeatherData}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="weather-main-grid">
        {/* Location Selection */}
        <div className="location-section">
          <div className="section-header">
            <h2>Location Selection</h2>
            <p>Click on map or enter coordinates</p>
          </div>
          
          <div className="location-controls">
            <div className="coordinate-inputs">
              <div className="input-group">
                <label>Latitude</label>
                <input
                  type="number"
                  value={manualCoords.lat}
                  onChange={(e) => handleManualCoordinateChange('lat', e.target.value)}
                  step="0.000001"
                  placeholder="29.7604"
                  className="coordinate-input"
                />
              </div>
              <div className="input-group">
                <label>Longitude</label>
                <input
                  type="number"
                  value={manualCoords.lng}
                  onChange={(e) => handleManualCoordinateChange('lng', e.target.value)}
                  step="0.000001"
                  placeholder="-95.3698"
                  className="coordinate-input"
                />
              </div>
              <button 
                className="btn btn-secondary"
                onClick={applyManualCoordinates}
              >
                Update Location
              </button>
            </div>
          </div>

          <div className="mini-map">
            <MapContainer
              center={[selectedLocation.lat, selectedLocation.lng]}
              zoom={10}
              style={{ height: '250px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <LocationSelector 
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
              />
            </MapContainer>
          </div>
        </div>

        {/* Current Weather */}
        <div className="current-weather-section">
          <div className="section-header">
            <h2>Current Conditions</h2>
            {lastUpdate && (
              <p className="last-update">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          {weatherData ? (
            <div className={`weather-card ${getCurrentConditionClass(weatherData.temperature)}`}>
              <div className="weather-main">
                <div className="weather-icon">
                  {getWeatherIcon(weatherData.conditions)}
                </div>
                <div className="weather-temp">
                  <span className="temp-value">
                    {weatherData.temperature || '--'}°
                  </span>
                  <span className="temp-unit">
                    {weatherData.temperatureUnit || 'F'}
                  </span>
                </div>
                <div className="weather-condition">
                  {weatherData.conditions || weatherData.shortForecast || 'Unknown'}
                </div>
              </div>
              
              <div className="weather-details">
                <div className="detail-item">
                  <span className="detail-icon">💨</span>
                  <span className="detail-label">Wind</span>
                  <span className="detail-value">
                    {weatherData.windSpeed || '--'} {getWindDirection(weatherData.windDirection)}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">💧</span>
                  <span className="detail-label">Humidity</span>
                  <span className="detail-value">
                    {weatherData.humidity ? `${weatherData.humidity}%` : '--'}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">🌡️</span>
                  <span className="detail-label">Pressure</span>
                  <span className="detail-value">
                    {weatherData.pressure ? `${Math.round(weatherData.pressure / 100)} hPa` : '--'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>No current weather data available</p>
              <button className="btn btn-primary" onClick={loadWeatherData}>
                Load Weather Data
              </button>
            </div>
          )}
        </div>

        {/* Tidal Information */}
        {tidalData && (
          <div className="tidal-section">
            <div className="section-header">
              <h2>Tidal Information</h2>
              <p>{tidalData.stationName || 'Nearest Station'}</p>
            </div>
            
            <div className="tidal-card">
              <div className="tidal-current">
                <span className="tidal-icon">🌊</span>
                <div className="tidal-info">
                  <div className="tidal-level">
                    {tidalData.currentLevel} {tidalData.levelUnit || 'ft'}
                  </div>
                  <div className="tidal-time">
                    {new Date(tidalData.time || tidalData.lastUpdated).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              {tidalData.trend && (
                <div className="tidal-trend">
                  <span>Trend: {tidalData.trend}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Forecast Section */}
      <div className="forecast-section">
        <div className="section-header">
          <h2>Extended Forecast</h2>
          <p>Hourly forecast for dispersion modeling</p>
        </div>
        
        {forecast.length > 0 ? (
          <div className="forecast-grid">
            {forecast.slice(0, 12).map((item, index) => (
              <div key={index} className="forecast-card">
                <div className="forecast-time">
                  {new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true
                  })}
                </div>
                <div className="forecast-icon">
                  {getWeatherIcon(item.shortForecast)}
                </div>
                <div className="forecast-temp">
                  {item.temperature}°{item.temperatureUnit || 'F'}
                </div>
                <div className="forecast-wind">
                  {item.windSpeed} {getWindDirection(item.windDirection)}
                </div>
                {item.humidity && (
                  <div className="forecast-humidity">
                    {item.humidity}%
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p>No forecast data available</p>
          </div>
        )}
      </div>

      {/* Environmental Impact */}
      <div className="environmental-section">
        <div className="section-header">
          <h2>Environmental Impact Factors</h2>
          <p>Key factors affecting spill dispersion</p>
        </div>
        
        <div className="impact-grid">
          <div className="impact-card">
            <div className="impact-header">
              <span className="impact-icon">💨</span>
              <h3>Wind Dispersion</h3>
            </div>
            <div className="impact-content">
              <p>Current wind conditions will affect surface spreading and evaporation rates.</p>
              {weatherData && (
                <div className="impact-assessment">
                  Wind Speed: <strong>{weatherData.windSpeed || '--'}</strong><br/>
                  Direction: <strong>{getWindDirection(weatherData.windDirection)}</strong><br/>
                  Impact: <strong>
                    {!weatherData.windSpeed ? 'Unknown' :
                     parseInt(weatherData.windSpeed) > 15 ? 'High' :
                     parseInt(weatherData.windSpeed) > 5 ? 'Moderate' : 'Low'}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="impact-card">
            <div className="impact-header">
              <span className="impact-icon">🌊</span>
              <h3>Water Movement</h3>
            </div>
            <div className="impact-content">
              <p>Tidal and current patterns influence spill trajectory.</p>
              {tidalData && (
                <div className="impact-assessment">
                  Current Level: <strong>{tidalData.currentLevel} {tidalData.levelUnit}</strong><br/>
                  Trend: <strong>{tidalData.trend || 'Unknown'}</strong><br/>
                  Impact: <strong>Moderate to High</strong>
                </div>
              )}
            </div>
          </div>

          <div className="impact-card">
            <div className="impact-header">
              <span className="impact-icon">🌡️</span>
              <h3>Temperature Effects</h3>
            </div>
            <div className="impact-content">
              <p>Temperature affects chemical behavior and evaporation.</p>
              {weatherData && (
                <div className="impact-assessment">
                  Temperature: <strong>{weatherData.temperature}°{weatherData.temperatureUnit}</strong><br/>
                  Evaporation Rate: <strong>
                    {!weatherData.temperature ? 'Unknown' :
                     weatherData.temperature > 85 ? 'High' :
                     weatherData.temperature > 65 ? 'Moderate' : 'Low'}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherPanel;