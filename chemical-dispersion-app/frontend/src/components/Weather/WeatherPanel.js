import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './WeatherPanel.css';

function WeatherPanel() {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [tidalData, setTidalData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [locationInput, setLocationInput] = useState({
        latitude: '',
        longitude: ''
    });

    useEffect(() => {
        // Load default location (Houston, TX)
        const defaultLocation = { lat: 29.7604, lng: -95.3698 };
        setSelectedLocation(defaultLocation);
        loadWeatherData(defaultLocation.lat, defaultLocation.lng);
    }, []);

    const loadWeatherData = async (lat = selectedLocation?.lat, lng = selectedLocation?.lng) => {
        if (!lat || !lng) return;

        try {
            setLoading(true);
            setError(null);
            
            // Get weather data
            const [currentWeather, forecast] = await Promise.all([
                apiService.getCurrentWeather(lat, lng),
                apiService.getWeatherForecast(lat, lng, 72)
            ]);
            
            setCurrentWeather(currentWeather);
            setForecast(Array.isArray(forecast) ? forecast : []);
            
            // Get tidal data - use correct function name
            try {
                const tidalData = await apiService.getTideForecast(lat, lng, 72);
                setTidalData(Array.isArray(tidalData) ? tidalData : []);
            } catch (tidalError) {
                console.warn('Tidal data not available for this location:', tidalError);
                setTidalData([]);
            }
            
        } catch (error) {
            console.error('Error loading weather data:', error);
            setError('Failed to load weather data. Please try again.');
        } finally {
            setLoading(false);
        }
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
        setSelectedLocation(newLocation);
        loadWeatherData(lat, lng);
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="weather-panel">
            <div className="weather-header">
                <h1>🌤️ Weather & Environmental Data</h1>
                <p>Current weather conditions and forecasts for chemical dispersion modeling</p>
            </div>

            {/* Location Input */}
            <div className="location-section">
                <h2>📍 Location</h2>
                <form onSubmit={handleLocationSubmit} className="location-form">
                    <div className="location-inputs">
                        <input
                            type="number"
                            name="latitude"
                            placeholder="Latitude"
                            value={locationInput.latitude}
                            onChange={handleLocationInputChange}
                            step="0.0001"
                            min="-90"
                            max="90"
                        />
                        <input
                            type="number"
                            name="longitude"
                            placeholder="Longitude"
                            value={locationInput.longitude}
                            onChange={handleLocationInputChange}
                            step="0.0001"
                            min="-180"
                            max="180"
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            Get Weather
                        </button>
                    </div>
                </form>
                
                {selectedLocation && (
                    <div className="current-location">
                        <p><strong>Current Location:</strong> {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            {loading && (
                <div className="loading-section">
                    <div className="loading-spinner"></div>
                    <p>Loading weather data...</p>
                </div>
            )}

            {/* Current Weather */}
            {currentWeather && !loading && (
                <div className="current-weather">
                    <h2>Current Conditions</h2>
                    <div className="weather-card">
                        <div className="weather-main">
                            <div className="temperature">
                                {currentWeather.temperature}°{currentWeather.temperatureUnit || 'F'}
                            </div>
                            <div className="condition">
                                {currentWeather.weatherCondition || currentWeather.shortForecast || 'Clear'}
                            </div>
                        </div>
                        <div className="weather-details">
                            <div className="detail-item">
                                <span className="label">Wind:</span>
                                <span className="value">
                                    {currentWeather.windSpeed} {currentWeather.windDirection}
                                </span>
                            </div>
                            {currentWeather.humidity && (
                                <div className="detail-item">
                                    <span className="label">Humidity:</span>
                                    <span className="value">{currentWeather.humidity}%</span>
                                </div>
                            )}
                            {currentWeather.pressure && (
                                <div className="detail-item">
                                    <span className="label">Pressure:</span>
                                    <span className="value">{currentWeather.pressure} mb</span>
                                </div>
                            )}
                            {currentWeather.visibility && (
                                <div className="detail-item">
                                    <span className="label">Visibility:</span>
                                    <span className="value">{currentWeather.visibility} mi</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Forecast */}
            {forecast.length > 0 && !loading && (
                <div className="forecast-section">
                    <h2>Weather Forecast</h2>
                    <div className="forecast-grid">
                        {forecast.slice(0, 8).map((period, index) => (
                            <div key={index} className="forecast-card">
                                <div className="forecast-time">
                                    <div className="day">{formatDate(period.timestamp || period.startTime)}</div>
                                    <div className="time">{formatTime(period.timestamp || period.startTime)}</div>
                                </div>
                                <div className="forecast-weather">
                                    <div className="forecast-temp">
                                        {period.temperature}°{period.temperatureUnit || 'F'}
                                    </div>
                                    <div className="forecast-condition">
                                        {period.weatherCondition || period.shortForecast}
                                    </div>
                                    <div className="forecast-wind">
                                        Wind: {period.windSpeed} {period.windDirection}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tidal Data */}
            {tidalData.length > 0 && !loading && (
                <div className="tidal-section">
                    <h2>🌊 Tidal Information</h2>
                    <div className="tidal-grid">
                        {tidalData.slice(0, 8).map((tide, index) => (
                            <div key={index} className="tidal-card">
                                <div className="tidal-time">
                                    <div className="day">{formatDate(tide.timestamp)}</div>
                                    <div className="time">{formatTime(tide.timestamp)}</div>
                                </div>
                                <div className="tidal-level">
                                    <div className="height">{tide.tideHeight} ft</div>
                                    <div className="station">{tide.stationName || tide.stationId}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="tidal-info">
                        <p><strong>Note:</strong> Tidal data is important for accurate chemical dispersion modeling in coastal waters.</p>
                    </div>
                </div>
            )}

            {/* Environmental Impact Notes */}
            <div className="environmental-notes">
                <h2>📊 Environmental Factors for Dispersion Modeling</h2>
                <div className="notes-grid">
                    <div className="note-card">
                        <h3>Wind Effects</h3>
                        <p>Wind speed and direction significantly affect the spread and direction of chemical plumes in water and air.</p>
                    </div>
                    <div className="note-card">
                        <h3>Temperature</h3>
                        <p>Temperature affects chemical volatility, reaction rates, and biological processes.</p>
                    </div>
                    <div className="note-card">
                        <h3>Tidal Movement</h3>
                        <p>Tidal currents influence the transport and mixing of chemicals in coastal and estuarine waters.</p>
                    </div>
                    <div className="note-card">
                        <h3>Atmospheric Stability</h3>
                        <p>Weather conditions affect how chemicals disperse in the atmosphere and water column.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WeatherPanel;
