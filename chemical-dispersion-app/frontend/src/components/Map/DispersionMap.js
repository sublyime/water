import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { apiService } from '../../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './DispersionMap.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Fullscreen control component
function FullscreenControl({ onToggle }) {
    const map = useMap();
    
    useEffect(() => {
        const control = L.control({ position: 'topright' });
        control.onAdd = () => {
            const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control fullscreen-btn');
            button.innerHTML = '⛶';
            button.title = 'Toggle Fullscreen';
            button.onclick = onToggle;
            return button;
        };
        control.addTo(map);
        return () => control.remove();
    }, [map, onToggle]);

    return null;
}

function DispersionMap({ spills = [], selectedSpill, onSpillSelect, calculateDispersion }) {
    const [dispersionData, setDispersionData] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState(null);
    const [mapCenter] = useState([29.7604, -95.3698]); // Houston, TX
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [weatherData, setWeatherData] = useState(null);
    const [tidalData, setTidalData] = useState(null);
    const [spillVisualizations, setSpillVisualizations] = useState({});

    const calculationsInProgress = useRef(new Set());
    const hasCalculatedRef = useRef(new Set());
    const lastCalculationRef = useRef(null);
    const mapRef = useRef(null);

    // Load environmental data for selected spill
    useEffect(() => {
        if (selectedSpill?.latitude && selectedSpill?.longitude) {
            loadEnvironmentalData(selectedSpill.latitude, selectedSpill.longitude);
            if (!hasCalculatedRef.current.has(selectedSpill.id) && 
                !isCalculating && 
                lastCalculationRef.current !== selectedSpill.id) {
                handleCalculateDispersion(selectedSpill.id);
            }
        }
    }, [selectedSpill?.id]);

    // Update spill visualizations when environmental data changes
    useEffect(() => {
        if (weatherData && tidalData && selectedSpill) {
            updateSpillVisualization(selectedSpill);
        }
    }, [weatherData, tidalData, selectedSpill, dispersionData]);

    const loadEnvironmentalData = async (lat, lng) => {
        try {
            const [weather, tides] = await Promise.all([
                apiService.getCurrentWeather(lat, lng).catch(err => {
                    console.warn('Weather data unavailable:', err);
                    return createMockWeather();
                }),
                apiService.getTideForecast(lat, lng, 24).catch(err => {
                    console.warn('Tidal data unavailable:', err);
                    return [createMockTide()];
                })
            ]);
            
            setWeatherData(weather);
            setTidalData(Array.isArray(tides) ? tides[0] : tides);
        } catch (error) {
            console.error('Error loading environmental data:', error);
            setWeatherData(createMockWeather());
            setTidalData(createMockTide());
        }
    };

    const createMockWeather = () => ({
        temperature: 22.0,
        windSpeed: 5.5,
        windDirection: 180.0,
        humidity: 65.0,
        pressure: 1013.25,
        visibility: 10.0,
        weatherCondition: 'Partly Cloudy'
    });

    const createMockTide = () => ({
        tideHeight: 1.2,
        currentSpeed: 0.3,
        currentDirection: 90,
        time: new Date().toISOString()
    });

    const updateSpillVisualization = (spill) => {
        if (!spill || !weatherData || !tidalData) return;

        // Safely extract and validate numeric values
        const volume = parseFloat(spill.volume) || 1000;
        const windSpeed = parseFloat(weatherData.windSpeed) || 5;
        const temperature = parseFloat(weatherData.temperature) || 20;
        const currentSpeed = parseFloat(tidalData.currentSpeed) || 0.3;
        const windDirection = parseFloat(weatherData.windDirection) || 0;
        const currentDirection = parseFloat(tidalData.currentDirection) || 0;

        // Calculate base radius from volume with safety checks
        const baseRadius = Math.max(100, Math.sqrt(volume) * 2); // Minimum 100m radius
        
        // Environmental factors with bounds checking
        const windEffect = Math.min(Math.max(windSpeed / 10, 0.1), 2.0); // 0.1 to 2.0
        const tideEffect = Math.min(Math.max(currentSpeed * 100, 0.1), 1.5); // 0.1 to 1.5
        const tempEffect = Math.min(Math.max((temperature - 15) / 20, 0.5), 1.5); // 0.5 to 1.5
        
        // Chemical properties effect (simplified)
        const chemicalEffect = getChemicalSpreadFactor(spill.chemicalType);
        
        // Calculate final radius with safety bounds
        const calculatedRadius = baseRadius * (1 + windEffect + tideEffect + tempEffect) * chemicalEffect;
        const finalRadius = Math.max(100, Math.min(calculatedRadius, 10000)); // Between 100m and 10km
        
        // Calculate spread direction based on wind and current
        const avgDirection = (windDirection + currentDirection) / 2;
        
        // Ensure opacity is valid
        const calculatedOpacity = Math.min(0.8, 0.3 + volume / 10000);
        const finalOpacity = Math.max(0.1, Math.min(calculatedOpacity, 0.8));
        
        // Validate all values before setting state
        if (isFinite(finalRadius) && isFinite(avgDirection) && isFinite(finalOpacity)) {
            setSpillVisualizations(prev => ({
                ...prev,
                [spill.id]: {
                    radius: finalRadius,
                    direction: avgDirection,
                    opacity: finalOpacity,
                    color: getSpillColor(spill.chemicalType, spill.priority)
                }
            }));
        } else {
            console.warn('Invalid visualization values calculated for spill:', spill.id);
            // Set safe default values
            setSpillVisualizations(prev => ({
                ...prev,
                [spill.id]: {
                    radius: 500, // Default 500m radius
                    direction: 0,
                    opacity: 0.5,
                    color: getSpillColor(spill.chemicalType, spill.priority)
                }
            }));
        }
    };

    const getChemicalSpreadFactor = (chemicalType) => {
        if (!chemicalType) return 1.0;
        const chemical = chemicalType.toLowerCase();
        if (chemical.includes('oil') || chemical.includes('petroleum')) return 1.5;
        if (chemical.includes('acid') || chemical.includes('toxic')) return 0.8;
        if (chemical.includes('gas') || chemical.includes('volatile')) return 2.0;
        return 1.0;
    };

    const getSpillColor = (chemicalType, priority) => {
        if (priority === 'CRITICAL') return '#dc2626';
        if (priority === 'HIGH') return '#ea580c';
        if (!chemicalType) return '#3b82f6';
        
        const chemical = chemicalType.toLowerCase();
        if (chemical.includes('oil')) return '#92400e';
        if (chemical.includes('toxic') || chemical.includes('acid')) return '#7c2d12';
        if (chemical.includes('gas')) return '#4338ca';
        return '#3b82f6';
    };

    const handleCalculateDispersion = async (spillId) => {
        if (calculationsInProgress.current.has(spillId) || 
            hasCalculatedRef.current.has(spillId) || 
            lastCalculationRef.current === spillId) {
            console.log(`[SKIP] Already calculating or calculated for spill ${spillId}`);
            return;
        }

        setIsCalculating(true);
        setError(null);
        lastCalculationRef.current = spillId;
        
        try {
            console.log(`[CALCULATING] Starting dispersion for spill ${spillId}`);
            
            const result = await calculateDispersion(spillId, 24);
            setDispersionData(result);
            hasCalculatedRef.current.add(spillId);
            
            console.log(`[SUCCESS] Dispersion calculation completed for ${spillId}`);
        } catch (error) {
            console.error('Dispersion calculation failed:', error);
            setError('Failed to calculate dispersion. Please try again.');
            hasCalculatedRef.current.delete(spillId);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleManualCalculation = () => {
        if (selectedSpill?.id) {
            hasCalculatedRef.current.delete(selectedSpill.id);
            lastCalculationRef.current = null;
            handleCalculateDispersion(selectedSpill.id);
        }
    };

    const handleEndIncident = async (spillId) => {
        if (!spillId) return;
        
        const confirmed = window.confirm('Are you sure you want to end this incident? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await apiService.updateSpillStatus(spillId, 'CLEANED_UP');
            console.log(`Incident ${spillId} marked as cleaned up`);
        } catch (error) {
            console.error('Error ending incident:', error);
            alert('Failed to end incident. Please try again.');
        }
    };

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    const togglePanel = useCallback(() => {
        setIsPanelCollapsed(prev => !prev);
    }, []);

    const createCustomIcon = (spill) => {
        const color = getSpillColor(spill.chemicalType, spill.priority);
        return L.divIcon({
            className: 'custom-spill-marker',
            html: `<div style="
                background-color: ${color}; 
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
            ">${spill.priority === 'CRITICAL' ? '!' : spill.priority === 'HIGH' ? '⚠' : '●'}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    };

    // Safety function to validate circle props
    const getCircleProps = (viz, spill) => {
        const radius = parseFloat(viz.radius);
        const opacity = parseFloat(viz.opacity);
        
        // Ensure all values are valid numbers
        if (!isFinite(radius) || radius <= 0) {
            console.warn(`Invalid radius for spill ${spill.id}:`, radius);
            return null; // Don't render invalid circles
        }
        
        if (!isFinite(opacity) || opacity < 0 || opacity > 1) {
            console.warn(`Invalid opacity for spill ${spill.id}:`, opacity);
            return null;
        }

        return {
            radius: Math.max(100, Math.min(radius, 10000)), // Constrain between 100m and 10km
            pathOptions: {
                color: viz.color || '#3b82f6',
                fillColor: viz.color || '#3b82f6',
                fillOpacity: Math.max(0.1, Math.min(opacity * 0.3, 0.3)),
                weight: 2,
                opacity: Math.max(0.1, Math.min(opacity, 0.8))
            }
        };
    };

    return (
        <div className={`dispersion-map-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Collapsible Control Panel */}
            <div className={`control-panel ${isPanelCollapsed ? 'collapsed' : ''}`}>
                <button className="panel-toggle" onClick={togglePanel}>
                    <span className={`toggle-icon ${isPanelCollapsed ? 'collapsed' : ''}`}>
                        {isPanelCollapsed ? '▼' : '▲'}
                    </span>
                    {isPanelCollapsed ? 'Show Controls' : 'Hide Controls'}
                </button>
                
                <div className="panel-content">
                    <div className="panel-header">
                        <h2>Chemical Dispersion Map</h2>
                        <div className="header-actions">
                            <button 
                                className="btn btn-secondary btn-sm"
                                onClick={toggleFullscreen}
                            >
                                {isFullscreen ? '⤌ Exit Fullscreen' : '⤢ Fullscreen'}
                            </button>
                        </div>
                    </div>

                    {/* Map Controls */}
                    <div className="map-controls">
                        {selectedSpill && (
                            <div className="selected-spill-controls">
                                <h3>Selected: {selectedSpill.name}</h3>
                                <div className="control-buttons">
                                    <button 
                                        onClick={handleManualCalculation}
                                        disabled={isCalculating}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {isCalculating ? 'Calculating...' : 'Recalculate Dispersion'}
                                    </button>
                                    <button 
                                        onClick={() => handleEndIncident(selectedSpill.id)}
                                        className="btn btn-danger btn-sm"
                                    >
                                        End Incident
                                    </button>
                                </div>
                            </div>
                        )}

                         {/* Environmental Data Display */}
                        {(weatherData || tidalData) && (
                            <div className="environmental-data">
                                <h4>Environmental Conditions</h4>
                                {weatherData && (
                                    <div className="weather-summary">
                                        <span>🌡️ {weatherData.temperature}°C</span>
                                        <span>💨 {weatherData.windSpeed} @ {weatherData.windDirection}°</span>
                                        <span>☁️ {weatherData.weatherCondition}</span>
                                    </div>
                                )}
                                {tidalData && (
                                    <div className="tide-summary">
                                        <span>🌊 Tide: {tidalData.tideHeight}m</span>
                                        <span>➡️ Current: {tidalData.currentSpeed} m/s</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Legend */}
                        <div className="map-legend">
                            <h4>Legend</h4>
                            <div className="legend-items">
                                <div className="legend-item">
                                    <div className="legend-marker critical"></div>
                                    <span>Critical (&gt;10,000L)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-marker high"></div>
                                    <span>High Priority</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-marker medium"></div>
                                    <span>Medium Priority</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-marker cleaned"></div>
                                    <span>Cleaned Up</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Error Display */}
            {error && (
                <div className="error-overlay">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="btn btn-sm btn-secondary">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Calculation Status */}
            {isCalculating && (
                <div className="calculation-overlay">
                    <div className="calculation-content">
                        <div className="loading-spinner"></div>
                        <p>Calculating dispersion model for {selectedSpill?.name}...</p>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div className="map-wrapper">
                <MapContainer 
                    ref={mapRef}
                    center={mapCenter} 
                    zoom={11} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={!isFullscreen}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    <FullscreenControl onToggle={toggleFullscreen} />
                    
                    {/* Render spill markers with dynamic visualizations */}
                    {spills.map((spill) => {
                        const viz = spillVisualizations[spill.id];
                        const circleProps = viz ? getCircleProps(viz, spill) : null;
                        
                        return (
                            <React.Fragment key={spill.id}>
                                <Marker
                                    position={[spill.latitude, spill.longitude]}
                                    icon={createCustomIcon(spill)}
                                    eventHandlers={{
                                        click: () => onSpillSelect(spill)
                                    }}
                                >
                                    <Popup>
                                        <div className="spill-popup">
                                            <h4>{spill.name}</h4>
                                            <p><strong>Chemical:</strong> {spill.chemicalType}</p>
                                            <p><strong>Volume:</strong> {(spill.volume || 0).toLocaleString()}L</p>
                                            <p><strong>Status:</strong> 
                                                <span className={`status ${spill.status.toLowerCase()}`}>
                                                    {spill.status}
                                                </span>
                                            </p>
                                            <p><strong>Priority:</strong> {spill.priority}</p>
                                            <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
                                            
                                            <div className="popup-actions">
                                                <button 
                                                    onClick={handleManualCalculation}
                                                    disabled={isCalculating}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Calculate Dispersion
                                                </button>
                                                {spill.status !== 'CLEANED_UP' && (
                                                    <button 
                                                        onClick={() => handleEndIncident(spill.id)}
                                                        className="btn btn-sm btn-danger"
                                                    >
                                                        End Incident
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                                
                                {/* Dynamic dispersion visualization - only render if valid */}
                                {circleProps && spill.id === selectedSpill?.id && (
                                    <Circle
                                        center={[spill.latitude, spill.longitude]}
                                        radius={circleProps.radius}
                                        pathOptions={circleProps.pathOptions}
                                    >
                                        <Popup>
                                            <div className="dispersion-popup">
                                                <h4>Dispersion Zone</h4>
                                                <p><strong>Affected Radius:</strong> {Math.round(circleProps.radius)}m</p>
                                                <p><strong>Calculation Time:</strong> {dispersionData?.calculationTime}</p>
                                                <p><strong>Environmental Factors:</strong></p>
                                                <ul>
                                                    <li>Wind: {weatherData?.windSpeed} @ {weatherData?.windDirection}°</li>
                                                    <li>Current: {tidalData?.currentSpeed} m/s</li>
                                                    <li>Temperature: {weatherData?.temperature}°C</li>
                                                </ul>
                                            </div>
                                        </Popup>
                                    </Circle>
                                )}
                            </React.Fragment>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Spill Details Panel (when selected) */}
            {selectedSpill && !isPanelCollapsed && (
                <div className="spill-details-sidebar">
                    <div className="sidebar-header">
                        <h3>{selectedSpill.name}</h3>
                        <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => onSpillSelect(null)}
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="sidebar-content">
                        <div className="detail-section">
                            <h4>Incident Details</h4>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Chemical:</label>
                                    <span>{selectedSpill.chemicalType}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Volume:</label>
                                    <span>{(selectedSpill.volume || 0).toLocaleString()}L</span>
                                </div>
                                <div className="detail-item">
                                    <label>Status:</label>
                                    <span className={`status ${selectedSpill.status.toLowerCase()}`}>
                                        {selectedSpill.status}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Priority:</label>
                                    <span className={`priority ${selectedSpill.priority.toLowerCase()}`}>
                                        {selectedSpill.priority}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Location:</label>
                                    <span>{selectedSpill.latitude.toFixed(4)}, {selectedSpill.longitude.toFixed(4)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Reported:</label>
                                    <span>{new Date(selectedSpill.spillTime).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {dispersionData && (
                            <div className="detail-section">
                                <h4>Dispersion Analysis</h4>
                                <div className="analysis-data">
                                    <p><strong>Last Calculated:</strong> {dispersionData.calculationTime}</p>
                                    <p><strong>Affected Area:</strong> {dispersionData.affectedAreaKm2 || 0} km²</p>
                                    <p><strong>Model:</strong> Enhanced Gaussian Plume</p>
                                </div>
                            </div>
                        )}

                        <div className="sidebar-actions">
                            <button 
                                onClick={handleManualCalculation}
                                disabled={isCalculating}
                                className="btn btn-primary"
                            >
                                {isCalculating ? 'Calculating...' : 'Update Dispersion'}
                            </button>
                            {selectedSpill.status !== 'CLEANED_UP' && (
                                <button 
                                    onClick={() => handleEndIncident(selectedSpill.id)}
                                    className="btn btn-danger"
                                >
                                    End Incident
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DispersionMap;