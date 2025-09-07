import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

function WeatherPanel() {
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState({ lat: 29.7604, lng: -95.3698 }); // Houston default

  useEffect(() => {
    loadWeatherData();
  }, [location]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [currentWeather, weatherForecast] = await Promise.all([
        apiService.getCurrentWeather(location.lat, location.lng),
        apiService.getWeatherForecast(location.lat, location.lng, 72)
      ]);
      
      setWeatherData(currentWeather);
      setForecast(weatherForecast);
    } catch (error) {
      console.error('Error loading weather data:', error);
      setError('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Weather Conditions</h2>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
            <p>Loading weather data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Weather Conditions</h2>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadWeatherData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
      {/* Current Weather */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Current Weather</h2>
        </div>
        <div className="card-content">
          {weatherData ? (
            <div>
              <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                    {weatherData.temperature}°C
                  </h3>
                  <p style={{ margin: 0, color: '#666' }}>Temperature</p>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                    {weatherData.humidity}%
                  </h3>
                  <p style={{ margin: 0, color: '#666' }}>Humidity</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                    {weatherData.windSpeed} m/s
                  </h3>
                  <p style={{ margin: 0, color: '#666' }}>
                    Wind Speed ({getWindDirection(weatherData.windDirection)})
                  </p>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
                    {Math.round(weatherData.pressure / 100)} hPa
                  </h3>
                  <p style={{ margin: 0, color: '#666' }}>Pressure</p>
                </div>
              </div>
            </div>
          ) : (
            <p>No current weather data available</p>
          )}
        </div>
      </div>

      {/* Location Control */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Location</h2>
        </div>
        <div className="card-content">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input
              type="number"
              className="form-input"
              value={location.lat}
              onChange={(e) => setLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
              step="0.0001"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input
              type="number"
              className="form-input"
              value={location.lng}
              onChange={(e) => setLocation(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
              step="0.0001"
            />
          </div>
          <button className="btn btn-primary" onClick={loadWeatherData}>
            Update Weather
          </button>
        </div>
      </div>

      {/* Forecast */}
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-header">
          <h2 className="card-title">72-Hour Forecast</h2>
        </div>
        <div className="card-content">
          {forecast.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {forecast.slice(0, 8).map((item, index) => (
                <div key={index} style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </h4>
                  <p style={{ margin: '0.25rem 0', fontWeight: 'bold', color: '#1976d2' }}>
                    {item.temperature}°C
                  </p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                    Wind: {item.windSpeed} m/s {getWindDirection(item.windDirection)}
                  </p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                    Humidity: {item.humidity}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No forecast data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherPanel;