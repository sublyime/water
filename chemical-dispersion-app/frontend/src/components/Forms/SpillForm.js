import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseMap from '../BaseMap/BaseMap';
import { apiService } from '../../services/api';
import './SpillForm.css';

function SpillForm({ onSpillCreated }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [chemicalData, setChemicalData] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [tidalData, setTidalData] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        chemicalType: '',
        casNumber: '',
        source: '',
        volume: '',
        volumeKnown: 'yes',
        estimatedVolume: '',
        description: '',
        reporterName: '',
        reporterContact: '',
        priority: 'MEDIUM',
        latitude: '',
        longitude: '',
        waterDepth: '10'
    });
    
    const [formErrors, setFormErrors] = useState({});

    // Fetch chemical data from backend or PubChem API
    const fetchChemicalData = async (chemicalName, casNumber = null) => {
        if (!chemicalName && !casNumber) return;
        
        setLoading(true);
        try {
            // Try to get from local database first
            const localData = await apiService.getChemicalData(chemicalName || casNumber);
            if (localData) {
                setChemicalData(localData);
            } else {
                // If not in local db, fetch from external API
                const externalData = await apiService.fetchChemicalDataFromExternal(chemicalName || casNumber);
                setChemicalData(externalData);
            }
            
        } catch (error) {
            console.error('Error fetching chemical data:', error);
            setChemicalData({
                error: 'Failed to find chemical data. Please enter manually.',
                name: chemicalName,
                casNumber: casNumber
            });
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch environmental data (weather, tides)
    const fetchEnvironmentalData = async (lat, lng) => {
        if (!lat || !lng) return;
        
        setLoading(true);
        try {
            const weather = await apiService.getWeatherData(lat, lng);
            const tides = await apiService.getTidalData(lat, lng);
            setWeatherData(weather);
            setTidalData(tides);
        } catch (error) {
            console.error('Error fetching environmental data:', error);
            setWeatherData({ error: 'Failed to fetch weather data' });
            setTidalData({ error: 'Failed to fetch tidal data' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        const errors = validateStep(currentStep);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setCurrentStep(prev => prev + 1);

        // Fetch environmental data if moving to step 2 (location)
        if (currentStep === 1) {
            fetchEnvironmentalData(formData.latitude, formData.longitude);
        }
    };

    const nextStep = () => {
        const errors = validateStep(currentStep);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setFormErrors({});
        setCurrentStep(prev => prev + 1);
        if (currentStep === 2) {
            fetchEnvironmentalData(formData.latitude, formData.longitude);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleMapClick = (lat, lng) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
        setSelectedLocation({ lat, lng });
    };

    const handleSubmit = async () => {
        const errors = validateStep(currentStep);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        setFormErrors({});
        
        try {
            const spillData = {
                ...formData,
                volume: formData.volumeKnown === 'yes' ? parseFloat(formData.volume) : parseFloat(formData.estimatedVolume),
                spillTime: new Date().toISOString(),
                status: 'ACTIVE',
                chemicalData: chemicalData,
                weatherData: weatherData,
                tidalData: tidalData,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude)
            };
            
            const newSpill = await apiService.reportSpill(spillData);
            if (onSpillCreated) {
                onSpillCreated(newSpill);
            }
            navigate('/dashboard');
        } catch (error) {
            console.error('Error reporting spill:', error);
            setFormErrors({ submit: 'Failed to report spill. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const validateStep = (step) => {
        const errors = {};
        if (step === 1) {
            if (!formData.name) errors.name = 'Incident name is required.';
            if (!formData.chemicalType) errors.chemicalType = 'Chemical type is required.';
            if (!formData.source) errors.source = 'Spill source is required.';
            if (formData.volumeKnown === 'yes' && !formData.volume) errors.volume = 'Volume is required.';
            if (formData.volumeKnown === 'no' && !formData.estimatedVolume) errors.estimatedVolume = 'Estimated volume is required.';
        } else if (step === 2) {
            if (!formData.latitude || !formData.longitude) {
                errors.location = 'Please select a location on the map.';
            }
        } else if (step === 3) {
            if (!formData.reporterName) errors.reporterName = 'Your name is required.';
            if (!formData.reporterContact) errors.reporterContact = 'Contact information is required.';
        }
        return errors;
    };

    // Form steps rendering
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="form-step step-1">
                        <div className="step-header">
                            <span className="step-icon">1</span>
                            <h2>Incident Details</h2>
                        </div>
                        <p className="step-description">Provide basic information about the spill.</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">Incident Name</label>
                                <input 
                                    type="text" 
                                    id="name" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="e.g., Coastal Oil Leak"
                                    required
                                />
                                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="chemicalType">Chemical Type</label>
                                <input 
                                    type="text" 
                                    id="chemicalType" 
                                    name="chemicalType" 
                                    value={formData.chemicalType} 
                                    onChange={handleChange} 
                                    placeholder="e.g., Crude Oil, Toluene"
                                    required
                                />
                                {formErrors.chemicalType && <span className="error-message">{formErrors.chemicalType}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="casNumber">CAS Number (Optional)</label>
                                <input 
                                    type="text" 
                                    id="casNumber" 
                                    name="casNumber" 
                                    value={formData.casNumber} 
                                    onChange={handleChange} 
                                    placeholder="e.g., 108-88-3"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="source">Spill Source</label>
                                <input 
                                    type="text" 
                                    id="source" 
                                    name="source" 
                                    value={formData.source} 
                                    onChange={handleChange} 
                                    placeholder="e.g., Pipeline Leak, Tanker Rupture"
                                    required
                                />
                                {formErrors.source && <span className="error-message">{formErrors.source}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Volume</label>
                            <div className="volume-options">
                                <label>
                                    <input 
                                        type="radio" 
                                        name="volumeKnown" 
                                        value="yes" 
                                        checked={formData.volumeKnown === 'yes'} 
                                        onChange={handleChange} 
                                    /> Known
                                </label>
                                <label>
                                    <input 
                                        type="radio" 
                                        name="volumeKnown" 
                                        value="no" 
                                        checked={formData.volumeKnown === 'no'} 
                                        onChange={handleChange} 
                                    /> Estimated
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor={formData.volumeKnown === 'yes' ? "volume" : "estimatedVolume"}>
                                {formData.volumeKnown === 'yes' ? "Known Volume (Liters)" : "Estimated Volume (Liters)"}
                            </label>
                            <input
                                type="number"
                                id={formData.volumeKnown === 'yes' ? "volume" : "estimatedVolume"}
                                name={formData.volumeKnown === 'yes' ? "volume" : "estimatedVolume"}
                                value={formData.volumeKnown === 'yes' ? formData.volume : formData.estimatedVolume}
                                onChange={handleChange}
                                placeholder="e.g., 5000"
                                required
                            />
                            {formErrors.volume && <span className="error-message">{formErrors.volume}</span>}
                            {formErrors.estimatedVolume && <span className="error-message">{formErrors.estimatedVolume}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="priority">Incident Priority</label>
                            <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="form-step step-2">
                        <div className="step-header">
                            <span className="step-icon">2</span>
                            <h2>Location & Environment</h2>
                        </div>
                        <p className="step-description">Select the spill location on the map.</p>
                        
                        <div className="form-group location-group">
                            <label>Spill Location</label>
                            <div className="map-display">
                                <div className="spill-form-map-container">
                                    <BaseMap 
                                        location={selectedLocation} 
                                        onLocationSelect={handleMapClick}
                                    />
                                </div>
                            </div>
                            {formErrors.location && <span className="error-message">{formErrors.location}</span>}
                            
                            <div className="coordinate-inputs">
                                <input 
                                    type="text" 
                                    name="latitude" 
                                    value={formData.latitude} 
                                    onChange={handleChange}
                                    placeholder="Latitude" 
                                    readOnly
                                />
                                <input 
                                    type="text" 
                                    name="longitude" 
                                    value={formData.longitude} 
                                    onChange={handleChange}
                                    placeholder="Longitude" 
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="waterDepth">Estimated Water Depth (m)</label>
                            <input
                                type="number"
                                id="waterDepth"
                                name="waterDepth"
                                value={formData.waterDepth}
                                onChange={handleChange}
                                placeholder="e.g., 10"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="form-step step-3">
                        <div className="step-header">
                            <span className="step-icon">3</span>
                            <h2>Reporter & Confirmation</h2>
                        </div>
                        <p className="step-description">Please confirm your contact details.</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="reporterName">Your Name</label>
                                <input 
                                    type="text" 
                                    id="reporterName" 
                                    name="reporterName" 
                                    value={formData.reporterName} 
                                    onChange={handleChange}
                                    placeholder="e.g., Jane Doe"
                                    required
                                />
                                {formErrors.reporterName && <span className="error-message">{formErrors.reporterName}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="reporterContact">Contact Information</label>
                                <input 
                                    type="text" 
                                    id="reporterContact" 
                                    name="reporterContact" 
                                    value={formData.reporterContact} 
                                    onChange={handleChange}
                                    placeholder="e.g., jane.doe@email.com or (555) 123-4567"
                                    required
                                />
                                {formErrors.reporterContact && <span className="error-message">{formErrors.reporterContact}</span>}
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="description">Additional Notes (Optional)</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Provide any additional details about the incident."
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Confirmation Summary Rendering
    const renderSummary = () => {
        return (
            <div className="form-summary">
                <h3>Report Summary</h3>
                <div className="summary-section">
                    <h4>Incident Details</h4>
                    <p><strong>Name:</strong> {formData.name || 'N/A'}</p>
                    <p><strong>Chemical:</strong> {formData.chemicalType || 'N/A'}</p>
                    <p><strong>Source:</strong> {formData.source || 'N/A'}</p>
                    <p><strong>Volume:</strong> {formData.volumeKnown === 'yes' ? `${formData.volume || 'N/A'} L` : `${formData.estimatedVolume || 'N/A'} L (Est.)`}</p>
                    <p><strong>Priority:</strong> {formData.priority || 'N/A'}</p>
                </div>
                <div className="summary-section">
                    <h4>Location & Environment</h4>
                    <p><strong>Latitude:</strong> {formData.latitude || 'N/A'}</p>
                    <p><strong>Longitude:</strong> {formData.longitude || 'N/A'}</p>
                    <p><strong>Water Depth:</strong> {formData.waterDepth ? `${formData.waterDepth} m` : 'N/A'}</p>
                </div>
                <div className="summary-section">
                    <h4>Reporter Details</h4>
                    <p><strong>Name:</strong> {formData.reporterName || 'N/A'}</p>
                    <p><strong>Contact:</strong> {formData.reporterContact || 'N/A'}</p>
                </div>
                {chemicalData && (
                    <div className="summary-section">
                        <h4>Chemical Properties (from database)</h4>
                        <p><strong>Molecular Weight:</strong> {chemicalData.molecularWeight || 'N/A'}</p>
                        <p><strong>Hazard Class:</strong> {chemicalData.hazardClass || 'N/A'}</p>
                    </div>
                )}
                 {weatherData && !weatherData.error && (
                    <div className="summary-section">
                        <h4>Environmental Data</h4>
                        <p><strong>Weather:</strong> {weatherData.weatherCondition || 'N/A'}</p>
                        <p><strong>Wind Speed:</strong> {weatherData.windSpeed || 'N/A'} mph</p>
                        <p><strong>Tidal Stage:</strong> {tidalData[0]?.tideStage || 'N/A'}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="spill-form-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Processing...</p>
                </div>
            )}

            <div className="form-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
                </div>
                <div className="progress-steps">
                    <span className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. Details</span>
                    <span className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. Location</span>
                    <span className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. Confirm</span>
                </div>
            </div>

            <form className="spill-form" onSubmit={(e) => e.preventDefault()}>
                {currentStep < 3 && renderStep()}
                {currentStep === 3 && renderSummary()}
            </form>

            {/* Navigation */}
            <div className="step-actions">
                {currentStep > 1 && (
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={prevStep}
                        disabled={loading}
                    >
                        Previous
                    </button>
                )}
                
                {currentStep < 3 ? (
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={nextStep}
                        disabled={loading || (currentStep === 2 && !selectedLocation)}
                    >
                        Next
                    </button>
                ) : (
                    <button 
                        type="button" 
                        className="btn btn-primary btn-lg" 
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default SpillForm;