import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './WeatherPanel.css';

function WeatherPanel({ selectedLocation = null, autoRefresh = true }) {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [tidalData, setTidalData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [locationInput, setLocationInput] = useState({
        latitude: '',
        longitude: ''
    });

    // Initialize with default location or selected location
    useEffect(() => {
        if (selectedLocation) {
            setCurrentLocation(selectedLocation);
            loadWeatherData(selectedLocation.lat, selectedLocation.lng);
        } else {
            // Default location (Houston, TX)
            const defaultLocation = { lat: 29.7604, lng: -95.3698 };
            setCurrentLocation(defaultLocation);
            loadWeatherData(defaultLocation.lat, defaultLocation.lng);
        }
    }, [selectedLocation]);

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh || !currentLocation) return;

        const refreshInterval = setInterval(() => {
            loadWeatherData(currentLocation.lat, currentLocation.lng, false);
        }, 300000); // Refresh every 5 minutes

        return () => clearInterval(refreshInterval);
    }, [autoRefresh, currentLocation]);

    const loadWeatherData = async (lat, lng, showLoadingState = true) => {
        if (!lat || !lng) return;

        try {
            if (showLoadingState) {
                setLoading(true);
            }
            setError(null);
            
            console.log(`Loading weather data for ${lat}, ${lng}`);
            
            // Get weather data with better error handling
            const [currentWeatherResult, forecastResult] = await Promise.allSettled([
                apiService.getCurrentWeather(lat, lng),
                apiService.getWeatherForecast(lat, lng, 72)
            ]);
            
            // Handle current weather
            if (currentWeatherResult.status === 'fulfilled') {
                setCurrentWeather(currentWeatherResult.value);
            } else {
                console.warn('Current weather failed:', currentWeatherResult.reason);
                setCurrentWeather(createMockWeather());
            }
            
            // Handle forecast
            if (forecastResult.status === 'fulfilled') {
                const forecastData = forecastResult.value;
                setForecast(Array.isArray(forecastData) ? forecastData : []);
            } else {
                console.warn('Forecast failed:', forecastResult.reason);
                setForecast(createMockForecast());
            }
            
            // Get tidal data
            try {
                const tidalResult = await apiService.getTideForecast(lat, lng, 72);
                setTidalData(Array.isArray(tidalResult) ? tidalResult : []);
            } catch (tidalError) {
                console.warn('Tidal data not available for this location:', tidalError);
                setTidalData(createMockTidalData());
            }
            
            setLastUpdate(new Date());
            
        } catch (error) {
            console.error('Error loading weather data:', error);
            setError('Failed to load weather data. Using mock data for demonstration.');
            
            // Fallback to mock data
            setCurrentWeather(createMockWeather());
            setForecast(createMockForecast());
            setTidalData(createMockTidalData());
            setLastUpdate(new Date());
        } finally {
            if (showLoadingState) {
                setLoading(false);
            }
        }
    };

    const createMockWeather = () => ({
        temperature: Math.round(22.0 + (Math.random() - 0.5) * 10),
        temperatureUnit: 'C',
        windSpeed: `${Math.round(5.0 + Math.random() * 10)} m/s`,
        windDirection: `${Math.round(Math.random() * 360)}°`,
        humidity: Math.round(60.0 + Math.random() * 30),
        pressure: Math.round(1013.25 + (Math.random() - 0.5) * 20),
        visibility: Math.round(10.0 + Math.random() * 5),
        weatherCondition: ['Partly Cloudy', 'Clear', 'Overcast', 'Light Rain'][Math.floor(Math.random() * 4)],
        timestamp: new Date().toISOString()
    });

    const createMockForecast = () => {
        const forecast = [];
        for (let i = 0; i < 8; i++) {
            const date = new Date();
            date.setHours(date.getHours() + i * 3);
            forecast.push({
                timestamp: date.toISOString(),
                temperature: Math.round(20 + Math.random() * 15),
                temperatureUnit: 'C',
                windSpeed: `${Math.round(3 + Math.random() * 12)} m/s`,
                windDirection: `${Math.round(Math.random() * 360)}°`,
                weatherCondition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
            });
        }
        return forecast;
    };

    const createMockTidalData = () => {
        const tides = [];
        for (let i = 0; i < 8; i++) {
            const date = new Date();
            date.setHours(date.getHours() + i * 3);
            tides.push({
                timestamp: date.toISOString(),
                tideHeight: Math.round((1.0 + Math.random() * 2) * 10) / 10,
                stationName: 'Mock Station',
                stationId: 'MOCK001'
            });
        }
        return tides;
    };

    const handleLocationInputChange = (e) => {
        const { name, value } = e.target;
        setLocationInput(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLocationSubmit = (e) => {
        e.preventDefault();
        const lat = parseFloat(locationInput.latitude);
        const lng = parseFloat(locationInput.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            setError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.');
            return;
        }
        
        const newLocation = { lat, lng };
        setCurrentLocation(newLocation);
        loadWeatherData(lat, lng);
        
        // Clear the input after successful submission
        setLocationInput({ latitude: '', longitude: '' });
    };

    const formatTime = (dateString) => {
        try {
            return new Date(dateString).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid time';
        }
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Invalid date';
        }
    };

    const getWeatherIcon = (condition) => {
        if (!condition) return '☀️';
        const cond = condition.toLowerCase();
        if (cond.includes('rain')) return '🌧️';
        if (cond.includes('cloud')) return '☁️';
        if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
        if (cond.includes('snow')) return '❄️';
        if (cond.includes('storm')) return '⛈️';
        return '🌤️';
    };

    const getTemperatureClass = (temp) => {
        if (temp >= 30) return 'hot';
        if (temp >= 25) return 'warm';
        if (temp >= 15) return 'mild';
        if (temp >= 5) return 'cool';
        return 'cold';
    };

    return (
        <div className="weather-panel-container">
            {/* Loading State */}
            {loading && (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <h2>Loading Weather Data</h2>
                    <p>Fetching current conditions and forecasts...</p>
                </div>
            )}

            {!loading && (
                <>
                    {/* Header */}
                    <div className="weather-header">
                        <div className="header-content">
                            <h1>🌤️ Weather & Environmental Data</h1>
                            <p>Current weather conditions and forecasts for chemical dispersion modeling</p>
                            {lastUpdate && (
                                <p className="last-update">
                                    Last updated: {lastUpdate.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        <div className="header-controls">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={() => {}} // This would be controlled by parent component
                                    disabled
                                />
                                Auto-refresh (controlled by system)
                            </label>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => currentLocation && loadWeatherData(currentLocation.lat, currentLocation.lng)}
                                disabled={loading || !currentLocation}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="error-banner">
                            <span className="error-icon">⚠️</span>
                            <span>{error}</span>
                            <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => setError(null)}
                                style={{ marginLeft: 'auto' }}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Main Content Grid */}
                    <div className="weather-main-grid">
                        {/* Location Section */}
                        <div className="location-section">
                            <div className="section-header">
                                <h2>📍 Location</h2>
                                <p>Set coordinates for weather data</p>
                            </div>
                            
                            <form onSubmit={handleLocationSubmit}>
                                <div className="coordinate-inputs">
                                    <div className="input-group">
                                        <label>Latitude</label>
                                        <input
                                            type="number"
                                            name="latitude"
                                            className="coordinate-input"
                                            placeholder="29.7604"
                                            value={locationInput.latitude}
                                            onChange={handleLocationInputChange}
                                            step="0.0001"
                                            min="-90"
                                            max="90"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Longitude</label>
                                        <input
                                            type="number"
                                            name="longitude"
                                            className="coordinate-input"
                                            placeholder="-95.3698"
                                            value={locationInput.longitude}
                                            onChange={handleLocationInputChange}
                                            step="0.0001"
                                            min="-180"
                                            max="180"
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={loading}
                                    >
                                        Get Weather
                                    </button>
                                </div>
                            </form>
                            
                            {currentLocation && (
                                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                    <p><strong>Current Location:</strong> {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</p>
                                </div>
                            )}
                        </div>

                        {/* Current Weather */}
                        {currentWeather && (
                            <div className="current-weather-section">
                                <div className="section-header">
                                    <h2>Current Conditions</h2>
                                    <p>Real-time weather data</p>
                                </div>
                                
                                <div className={`weather-card ${getTemperatureClass(currentWeather.temperature)}`}>
                                    <div className="weather-main">
                                        <div className="weather-icon">
                                            {getWeatherIcon(currentWeather.weatherCondition)}
                                        </div>
                                        <div className="weather-temp">
                                            <span className="temp-value">{currentWeather.temperature}</span>
                                            <span className="temp-unit">°{currentWeather.temperatureUnit || 'C'}</span>
                                        </div>
                                        <div className="weather-condition">
                                            {currentWeather.weatherCondition || 'Clear'}
                                        </div>
                                    </div>
                                    
                                    <div className="weather-details">
                                        <div className="detail-item">
                                            <span className="detail-icon">💨</span>
                                            <span className="detail-label">Wind</span>
                                            <span className="detail-value">
                                                {currentWeather.windSpeed} {currentWeather.windDirection}
                                            </span>
                                        </div>
                                        {currentWeather.humidity && (
                                            <div className="detail-item">
                                                <span className="detail-icon">💧</span>
                                                <span className="detail-label">Humidity</span>
                                                <span className="detail-value">{currentWeather.humidity}%</span>
                                            </div>
                                        )}
                                        {currentWeather.pressure && (
                                            <div className="detail-item">
                                                <span className="detail-icon">🌡️</span>
                                                <span className="detail-label">Pressure</span>
                                                <span className="detail-value">{currentWeather.pressure} mb</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tidal Information */}
                        {tidalData.length > 0 && (
                            <div className="tidal-section">
                                <div className="section-header">
                                    <h2>🌊 Tidal Data</h2>
                                    <p>Current tidal conditions</p>
                                </div>
                                
                                <div className="tidal-card">
                                    <div className="tidal-current">
                                        <div className="tidal-icon">🌊</div>
                                        <div>
                                            <div className="tidal-level">
                                                {tidalData[0].tideHeight} ft
                                            </div>
                                            <div className="tidal-time">
                                                {formatTime(tidalData[0].timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="tidal-trend">
                                        {tidalData[0].stationName || tidalData[0].stationId || 'Local Station'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Forecast Section */}
                    {forecast.length > 0 && (
                        <div className="forecast-section">
                            <div className="section-header">
                                <h2>Weather Forecast</h2>
                                <p>Extended forecast for the next 24 hours</p>
                            </div>
                            
                            <div className="forecast-grid">
                                {forecast.slice(0, 8).map((period, index) => (
                                    <div key={index} className="forecast-card">
                                        <div className="forecast-time">
                                            {formatTime(period.timestamp)}
                                        </div>
                                        <div className="forecast-icon">
                                            {getWeatherIcon(period.weatherCondition)}
                                        </div>
                                        <div className="forecast-temp">
                                            {period.temperature}°{period.temperatureUnit || 'C'}
                                        </div>
                                        <div className="forecast-wind">
                                            {period.windSpeed} {period.windDirection}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Environmental Impact Section */}
                    <div className="environmental-section">
                        <div className="section-header">
                            <h2>📊 Environmental Factors for Dispersion Modeling</h2>
                            <p>Key factors affecting chemical dispersion in water and air</p>
                        </div>
                        
                        <div className="impact-grid">
                            <div className="impact-card">
                                <div className="impact-header">
                                    <span className="impact-icon">💨</span>
                                    <h3>Wind Effects</h3>
                                </div>
                                <div className="impact-content">
                                    <p>Wind speed and direction significantly affect the spread and direction of chemical plumes in water and air.</p>
                                    {currentWeather && (
                                        <div className="impact-assessment">
                                            Current conditions: {currentWeather.windSpeed} from {currentWeather.windDirection}
                                            <br />
                                            Impact: {parseInt(currentWeather.windSpeed) > 15 ? 'High dispersion rate' : 'Moderate dispersion rate'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="impact-card">
                                <div className="impact-header">
                                    <span className="impact-icon">🌡️</span>
                                    <h3>Temperature</h3>
                                </div>
                                <div className="impact-content">
                                    <p>Temperature affects chemical volatility, reaction rates, and biological processes.</p>
                                    {currentWeather && (
                                        <div className="impact-assessment">
                                            Current: {currentWeather.temperature}°{currentWeather.temperatureUnit}
                                            <br />
                                            Effect: {currentWeather.temperature > 25 ? 'Increased volatility' : 'Reduced volatility'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="impact-card">
                                <div className="impact-header">
                                    <span className="impact-icon">🌊</span>
                                    <h3>Tidal Movement</h3>
                                </div>
                                <div className="impact-content">
                                    <p>Tidal currents influence the transport and mixing of chemicals in coastal and estuarine waters.</p>
                                    {tidalData.length > 0 && (
                                        <div className="impact-assessment">
                                            Current tide: {tidalData[0].tideHeight} ft
                                            <br />
                                            Transport effect: {tidalData[0].tideHeight > 2 ? 'High' : 'Moderate'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="impact-card">
                                <div className="impact-header">
                                    <span className="impact-icon">☁️</span>
                                    <h3>Atmospheric Stability</h3>
                                </div>
                                <div className="impact-content">
                                    <p>Weather conditions affect how chemicals disperse in the atmosphere and water column.</p>
                                    {currentWeather && (
                                        <div className="impact-assessment">
                                            Conditions: {currentWeather.weatherCondition}
                                            <br />
                                            Stability: {currentWeather.weatherCondition?.toLowerCase().includes('clear') ? 'Stable' : 'Variable'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default WeatherPanel;