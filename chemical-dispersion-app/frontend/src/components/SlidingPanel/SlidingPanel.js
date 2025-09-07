import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './SlidingPanel.css';

// Enhanced sub-components
function IncidentDetails({ location, selectedSpill, onSpillUpdate }) {
    const [spillForm, setSpillForm] = useState({
        chemicalType: '',
        volume: '',
        source: '',
        priority: 'MEDIUM'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedSpill) {
            setSpillForm({
                chemicalType: selectedSpill.chemicalType || '',
                volume: selectedSpill.volume || '',
                source: selectedSpill.source || '',
                priority: selectedSpill.priority || 'MEDIUM'
            });
        }
    }, [selectedSpill]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSpillForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateSpill = async () => {
        if (!selectedSpill) return;

        setLoading(true);
        try {
            const updatedData = {
                ...selectedSpill,
                ...spillForm,
                volume: parseFloat(spillForm.volume) || selectedSpill.volume
            };

            await apiService.updateSpillStatus(selectedSpill.id, selectedSpill.status);
            if (onSpillUpdate) {
                onSpillUpdate(updatedData);
            }
        } catch (error) {
            console.error('Failed to update spill:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="incident-details">
            <h3>Incident Details</h3>
            
            {location ? (
                <div className="location-info">
                    <p><strong>Location:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                </div>
            ) : (
                <p className="no-location">Select a location on the map to start.</p>
            )}

            {selectedSpill ? (
                <div className="spill-form">
                    <div className="form-group">
                        <label>Incident ID:</label>
                        <p className="readonly-field">{selectedSpill.id}</p>
                    </div>
                    
                    <div className="form-group">
                        <label>Name:</label>
                        <p className="readonly-field">{selectedSpill.name}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="chemicalType">Chemical Type:</label>
                        <select
                            id="chemicalType"
                            name="chemicalType"
                            value={spillForm.chemicalType}
                            onChange={handleInputChange}
                            className="form-input"
                        >
                            <option value="">Select Chemical</option>
                            <option value="Crude Oil">Crude Oil</option>
                            <option value="Diesel Fuel">Diesel Fuel</option>
                            <option value="Gasoline">Gasoline</option>
                            <option value="Benzene">Benzene</option>
                            <option value="Toluene">Toluene</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="volume">Volume (Liters):</label>
                        <input
                            id="volume"
                            name="volume"
                            type="number"
                            value={spillForm.volume}
                            onChange={handleInputChange}
                            className="form-input"
                            min="0"
                            step="0.1"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="source">Source:</label>
                        <select
                            id="source"
                            name="source"
                            value={spillForm.source}
                            onChange={handleInputChange}
                            className="form-input"
                        >
                            <option value="">Select Source</option>
                            <option value="Pipeline">Pipeline</option>
                            <option value="Tank">Tank</option>
                            <option value="Truck">Truck</option>
                            <option value="Ship">Ship</option>
                            <option value="Rail">Rail</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="priority">Priority:</label>
                        <select
                            id="priority"
                            name="priority"
                            value={spillForm.priority}
                            onChange={handleInputChange}
                            className="form-input"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Status:</label>
                        <p className={`status-badge status-${selectedSpill.status?.toLowerCase()}`}>
                            {selectedSpill.status}
                        </p>
                    </div>

                    <div className="form-actions">
                        <button 
                            onClick={handleUpdateSpill}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Updating...' : 'Update Incident'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-spill">
                    <p>No incident selected</p>
                    <small>Click on a spill marker to view details</small>
                </div>
            )}
        </div>
    );
}

function MapLayers({ onLayerChange, selectedLayers = [] }) {
    const [availableLayers] = useState([
        { id: 'satellite', name: 'Satellite', description: 'Satellite imagery' },
        { id: 'terrain', name: 'Terrain', description: 'Topographic view' },
        { id: 'street', name: 'Street', description: 'Street map view' },
        { id: 'weather', name: 'Weather Overlay', description: 'Weather data overlay' },
        { id: 'currents', name: 'Ocean Currents', description: 'Current flow patterns' }
    ]);

    const handleLayerToggle = (layerId) => {
        const newLayers = selectedLayers.includes(layerId)
            ? selectedLayers.filter(id => id !== layerId)
            : [...selectedLayers, layerId];
        
        if (onLayerChange) {
            onLayerChange(newLayers);
        }
    };

    return (
        <div className="map-layers">
            <h3>Map Layers</h3>
            <div className="layers-list">
                {availableLayers.map(layer => (
                    <div key={layer.id} className="layer-item">
                        <label className="layer-checkbox">
                            <input
                                type="checkbox"
                                checked={selectedLayers.includes(layer.id)}
                                onChange={() => handleLayerToggle(layer.id)}
                            />
                            <span className="layer-name">{layer.name}</span>
                        </label>
                        <small className="layer-description">{layer.description}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Weather({ location }) {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (location) {
            loadWeatherData(location.lat, location.lng);
        }
    }, [location]);

    const loadWeatherData = async (lat, lng) => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await apiService.getCurrentWeather(lat, lng);
            setWeatherData(data);
        } catch (error) {
            setError('Failed to load weather data');
            console.error('Weather data error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="weather-loading">
                <div className="loading-spinner-small"></div>
                <p>Loading weather...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="weather-error">
                <h3>Weather</h3>
                <p className="error-message">{error}</p>
                {location && (
                    <button 
                        onClick={() => loadWeatherData(location.lat, location.lng)}
                        className="btn btn-sm btn-secondary"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="weather-info">
            <h3>Weather Conditions</h3>
            
            {location && (
                <p className="weather-location">
                    Location: {location.lat.toFixed(2)}, {location.lng.toFixed(2)}
                </p>
            )}
            
            {weatherData ? (
                <div className="weather-details">
                    <div className="weather-item">
                        <span className="weather-label">Temperature:</span>
                        <span className="weather-value">
                            {weatherData.temperature}{weatherData.temperatureUnit || 'C'}
                        </span>
                    </div>
                    
                    <div className="weather-item">
                        <span className="weather-label">Wind:</span>
                        <span className="weather-value">
                            {weatherData.windSpeed} {weatherData.windDirection}
                        </span>
                    </div>
                    
                    <div className="weather-item">
                        <span className="weather-label">Conditions:</span>
                        <span className="weather-value">{weatherData.weatherCondition}</span>
                    </div>
                    
                    {weatherData.humidity && (
                        <div className="weather-item">
                            <span className="weather-label">Humidity:</span>
                            <span className="weather-value">{weatherData.humidity}%</span>
                        </div>
                    )}
                    
                    {weatherData.pressure && (
                        <div className="weather-item">
                            <span className="weather-label">Pressure:</span>
                            <span className="weather-value">{weatherData.pressure} mb</span>
                        </div>
                    )}
                </div>
            ) : (
                <p className="no-weather">
                    {location ? 'Weather data not available' : 'No location selected'}
                </p>
            )}
        </div>
    );
}

function Analysis({ selectedSpill, weatherData }) {
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedSpill) {
            performAnalysis(selectedSpill);
        }
    }, [selectedSpill, weatherData]);

    const performAnalysis = async (spill) => {
        setLoading(true);
        try {
            // Mock analysis calculation
            const environmentalFactors = {
                windInfluence: weatherData?.windSpeed ? parseFloat(weatherData.windSpeed) : 5,
                temperatureEffect: weatherData?.temperature ? parseFloat(weatherData.temperature) : 20,
                chemicalType: spill.chemicalType || 'Unknown'
            };

            const riskLevel = calculateRiskLevel(spill, environmentalFactors);
            const dispersionRate = calculateDispersionRate(spill, environmentalFactors);
            
            setAnalysisData({
                riskLevel,
                dispersionRate,
                environmentalFactors,
                recommendations: generateRecommendations(spill, environmentalFactors)
            });
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateRiskLevel = (spill, factors) => {
        const volume = spill.volume || 0;
        const windSpeed = factors.windInfluence;
        const temp = factors.temperatureEffect;
        
        let risk = 0;
        if (volume > 10000) risk += 3;
        else if (volume > 5000) risk += 2;
        else if (volume > 1000) risk += 1;
        
        if (windSpeed > 15) risk += 2;
        else if (windSpeed > 10) risk += 1;
        
        if (temp > 30) risk += 1;
        
        if (factors.chemicalType?.toLowerCase().includes('toxic')) risk += 2;
        if (factors.chemicalType?.toLowerCase().includes('oil')) risk += 1;
        
        if (risk >= 6) return 'CRITICAL';
        if (risk >= 4) return 'HIGH';
        if (risk >= 2) return 'MEDIUM';
        return 'LOW';
    };

    const calculateDispersionRate = (spill, factors) => {
        const baseRate = Math.sqrt(spill.volume || 1000) / 10;
        const windMultiplier = (factors.windInfluence / 10) + 1;
        const tempMultiplier = (factors.temperatureEffect / 20) + 0.8;
        
        return Math.round(baseRate * windMultiplier * tempMultiplier * 100) / 100;
    };

    const generateRecommendations = (spill, factors) => {
        const recommendations = [];
        
        if (spill.volume > 10000) {
            recommendations.push('Immediate containment required - large volume spill');
        }
        
        if (factors.windInfluence > 15) {
            recommendations.push('High wind conditions - accelerated dispersion expected');
        }
        
        if (factors.chemicalType?.toLowerCase().includes('toxic')) {
            recommendations.push('Toxic substance - implement safety perimeter');
        }
        
        if (factors.temperatureEffect > 30) {
            recommendations.push('High temperature - increased volatilization risk');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Continue monitoring - conditions stable');
        }
        
        return recommendations;
    };

    return (
        <div className="analysis-panel">
            <h3>Spill Analysis</h3>
            
            {loading && (
                <div className="loading-spinner-small"></div>
            )}
            
            {selectedSpill ? (
                <div className="analysis-content">
                    {analysisData && (
                        <>
                            <div className="analysis-section">
                                <h4>Risk Assessment</h4>
                                <div className={`risk-badge risk-${analysisData.riskLevel.toLowerCase()}`}>
                                    {analysisData.riskLevel} RISK
                                </div>
                            </div>
                            
                            <div className="analysis-section">
                                <h4>Dispersion Rate</h4>
                                <p>{analysisData.dispersionRate} m²/hour estimated spread</p>
                            </div>
                            
                            <div className="analysis-section">
                                <h4>Environmental Factors</h4>
                                <ul className="factors-list">
                                    <li>Wind Speed: {analysisData.environmentalFactors.windInfluence} m/s</li>
                                    <li>Temperature: {analysisData.environmentalFactors.temperatureEffect}°C</li>
                                    <li>Chemical: {analysisData.environmentalFactors.chemicalType}</li>
                                </ul>
                            </div>
                            
                            <div className="analysis-section">
                                <h4>Recommendations</h4>
                                <ul className="recommendations-list">
                                    {analysisData.recommendations.map((rec, index) => (
                                        <li key={index}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <p>Select a spill to view analysis</p>
            )}
        </div>
    );
}

function Reports({ spills = [] }) {
    const [reportType, setReportType] = useState('summary');
    const [generating, setGenerating] = useState(false);

    const generateReport = async () => {
        setGenerating(true);
        
        try {
            const reportData = {
                type: reportType,
                timestamp: new Date().toISOString(),
                spills: spills,
                totalSpills: spills.length,
                activeSpills: spills.filter(s => s.status === 'ACTIVE').length
            };

            const content = formatReport(reportData);
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `spill-report-${reportType}-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Report generation failed:', error);
        } finally {
            setGenerating(false);
        }
    };

    const formatReport = (data) => {
        const timestamp = new Date(data.timestamp).toLocaleString();
        
        return `
${data.type.toUpperCase()} REPORT
Generated: ${timestamp}
============================

Total Incidents: ${data.totalSpills}
Active Incidents: ${data.activeSpills}

${data.spills.map((spill, index) => `
${index + 1}. ${spill.name || 'Unnamed'}
   Chemical: ${spill.chemicalType || 'Unknown'}
   Volume: ${(spill.volume || 0).toLocaleString()} L
   Status: ${spill.status || 'Unknown'}
   Location: ${spill.latitude || 0}, ${spill.longitude || 0}
`).join('')}
        `.trim();
    };

    return (
        <div className="reports-panel">
            <h3>Generate Reports</h3>
            
            <div className="report-options">
                <div className="form-group">
                    <label htmlFor="reportType">Report Type:</label>
                    <select
                        id="reportType"
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="form-input"
                    >
                        <option value="summary">Summary Report</option>
                        <option value="detailed">Detailed Report</option>
                        <option value="environmental">Environmental Impact</option>
                        <option value="response">Response Actions</option>
                    </select>
                </div>
                
                <button 
                    onClick={generateReport}
                    disabled={generating}
                    className="btn btn-primary"
                >
                    {generating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>
            
            <div className="report-info">
                <h4>Available Reports:</h4>
                <ul>
                    <li><strong>Summary:</strong> Overview of all incidents</li>
                    <li><strong>Detailed:</strong> Complete incident information</li>
                    <li><strong>Environmental:</strong> Environmental impact assessment</li>
                    <li><strong>Response:</strong> Response actions and status</li>
                </ul>
            </div>
        </div>
    );
}

// Main sliding panel component
function SlidingPanel({ 
    location, 
    selectedSpill, 
    onSpillUpdate, 
    onLayerChange, 
    selectedLayers = [],
    spills = [] 
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState('incident');
    const [weatherData, setWeatherData] = useState(null);

    // Load weather data when location changes
    useEffect(() => {
        if (location) {
            loadWeatherData(location.lat, location.lng);
        }
    }, [location]);

    const loadWeatherData = async (lat, lng) => {
        try {
            const data = await apiService.getCurrentWeather(lat, lng);
            setWeatherData(data);
        } catch (error) {
            console.warn('Could not load weather data for panel:', error);
        }
    };

    const sections = [
        { 
            id: 'incident', 
            label: 'Incident Details', 
            icon: '📍', 
            component: (
                <IncidentDetails 
                    location={location} 
                    selectedSpill={selectedSpill}
                    onSpillUpdate={onSpillUpdate}
                />
            ) 
        },
        { 
            id: 'layers', 
            label: 'Map Layers', 
            icon: '🗺️', 
            component: (
                <MapLayers 
                    onLayerChange={onLayerChange}
                    selectedLayers={selectedLayers}
                />
            ) 
        },
        { 
            id: 'weather', 
            label: 'Weather', 
            icon: '☁️', 
            component: <Weather location={location} /> 
        },
        { 
            id: 'analysis', 
            label: 'Analysis', 
            icon: '📊', 
            component: (
                <Analysis 
                    selectedSpill={selectedSpill}
                    weatherData={weatherData}
                />
            ) 
        },
        { 
            id: 'reports', 
            label: 'Reports', 
            icon: '📄', 
            component: <Reports spills={spills} /> 
        },
    ];

    const handleSectionChange = (sectionId) => {
        setActiveSection(sectionId);
        if (isCollapsed) {
            setIsCollapsed(false);
        }
    };

    return (
        <div className={`sliding-panel ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? '▶' : '◀'}
            </div>
            
            {!isCollapsed && (
                <div className="panel-content">
                    <div className="section-tabs">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                className={`tab ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <span className="tab-icon">{section.icon}</span>
                                <span className="tab-label">{section.label}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="section-body">
                        {sections.find((s) => s.id === activeSection)?.component}
                    </div>
                </div>
            )}
            
            {isCollapsed && (
                <div className="collapsed-icons">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`icon-btn ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => handleSectionChange(section.id)}
                            title={section.label}
                        >
                            {section.icon}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SlidingPanel;