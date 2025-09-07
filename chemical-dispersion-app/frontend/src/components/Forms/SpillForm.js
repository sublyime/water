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
    longitude: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch chemical data from PubChem API
  const fetchChemicalData = async (chemicalName, casNumber = null) => {
    if (!chemicalName && !casNumber) return;
    
    setLoading(true);
    try {
      let url;
      if (casNumber) {
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(casNumber)}/JSON`;
      } else {
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(chemicalName)}/JSON`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const compound = data.PC_Compounds[0];
        
        const chemicalInfo = {
          cid: compound.id.id.cid,
          molecularFormula: compound.atoms ? 'Available' : 'Unknown',
          molecularWeight: compound.props ? 
            compound.props.find(p => p.urn.label === 'Molecular Weight')?.value?.fval || 'Unknown' 
            : 'Unknown',
          iupacName: compound.props ? 
            compound.props.find(p => p.urn.label === 'IUPAC Name')?.value?.sval || chemicalName
            : chemicalName,
          synonyms: compound.props ? 
            compound.props.filter(p => p.urn.label === 'Synonym').map(p => p.value.sval).slice(0, 5)
            : [],
          hazardClass: 'Unknown - Please verify safety data'
        };
        
        setChemicalData(chemicalInfo);
        
        // Store in local database
        await apiService.storeChemicalData(chemicalInfo);
        
      } else {
        // Try local database
        const localData = await apiService.getChemicalData(chemicalName);
        setChemicalData(localData);
      }
    } catch (error) {
      console.error('Error fetching chemical data:', error);
      // Try local database as fallback
      try {
        const localData = await apiService.getChemicalData(chemicalName || casNumber);
        setChemicalData(localData);
      } catch (localError) {
        console.error('Error fetching from local database:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather data from weather.gov API
  const fetchWeatherData = async (lat, lng) => {
    if (!lat || !lng) return;
    
    try {
      // Get weather grid point
      const gridResponse = await fetch(
        `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`
      );
      
      if (gridResponse.ok) {
        const gridData = await gridResponse.json();
        const forecastUrl = gridData.properties.forecast;
        
        // Get current conditions
        const forecastResponse = await fetch(forecastUrl);
        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          const current = forecastData.properties.periods[0];
          
          setWeatherData({
            temperature: current.temperature,
            temperatureUnit: current.temperatureUnit,
            windSpeed: current.windSpeed,
            windDirection: current.windDirection,
            shortForecast: current.shortForecast,
            detailedForecast: current.detailedForecast,
            humidity: 'Available via detailed forecast',
            lastUpdated: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Use mock data for demo
      setWeatherData({
        temperature: 72,
        temperatureUnit: 'F',
        windSpeed: '5 mph',
        windDirection: 'SE',
        shortForecast: 'Partly Cloudy',
        humidity: '65%',
        lastUpdated: new Date().toISOString()
      });
    }
  };

  // Fetch tidal data from NOAA
  const fetchTidalData = async (lat, lng) => {
    if (!lat || !lng) return;
    
    try {
      // Find nearest tide station (simplified - would need station lookup)
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const stationId = '8771450'; // Galveston Bay (example)
      
      const tidalResponse = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${stationId}&product=water_level&datum=MLLW&time_zone=lst_ldt&units=english&format=json`
      );
      
      if (tidalResponse.ok) {
        const tidalResult = await tidalResponse.json();
        if (tidalResult.data && tidalResult.data.length > 0) {
          const latest = tidalResult.data[tidalResult.data.length - 1];
          setTidalData({
            currentLevel: latest.v,
            time: latest.t,
            station: tidalResult.metadata?.name || 'Nearest Station',
            trend: 'Available',
            lastUpdated: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching tidal data:', error);
      // Use mock data for demo
      setTidalData({
        currentLevel: '2.3 ft',
        time: new Date().toLocaleTimeString(),
        station: 'Galveston Bay',
        trend: 'Rising',
        lastUpdated: new Date().toISOString()
      });
    }
  };

  // Handle location selection from map
  const handleLocationSelected = (location) => {
    if (location) {
      setSelectedLocation(location);
      setFormData(prev => ({
        ...prev,
        latitude: location.lat.toString(),
        longitude: location.lng.toString()
      }));
      
      // Fetch environmental data
      fetchWeatherData(location.lat, location.lng);
      fetchTidalData(location.lat, location.lng);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    
    // Fetch chemical data when chemical name changes
    if (name === 'chemicalType' && value.length > 3) {
      const timeoutId = setTimeout(() => {
        fetchChemicalData(value, formData.casNumber);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Fetch chemical data when CAS number changes
    if (name === 'casNumber' && value.length > 5) {
      const timeoutId = setTimeout(() => {
        fetchChemicalData(formData.chemicalType, value);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Incident name is required';
    if (!formData.chemicalType.trim()) errors.chemicalType = 'Chemical type is required';
    if (!formData.source.trim()) errors.source = 'Source is required';
    if (!selectedLocation) errors.location = 'Please select a location on the map';
    if (formData.volumeKnown === 'yes' && !formData.volume) {
      errors.volume = 'Volume is required when known';
    }
    if (formData.volumeKnown === 'no' && !formData.estimatedVolume) {
      errors.estimatedVolume = 'Estimated volume is required';
    }
    if (!formData.reporterName.trim()) errors.reporterName = 'Reporter name is required';
    if (!formData.reporterContact.trim()) errors.reporterContact = 'Contact information is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const spillData = {
        name: formData.name,
        chemicalType: formData.chemicalType,
        casNumber: formData.casNumber || null,
        source: formData.source,
        volume: formData.volumeKnown === 'yes' ? parseFloat(formData.volume) : parseFloat(formData.estimatedVolume),
        volumeEstimated: formData.volumeKnown === 'no',
        description: formData.description,
        reporterName: formData.reporterName,
        reporterContact: formData.reporterContact,
        priority: formData.priority,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        spillTime: new Date().toISOString(),
        status: 'ACTIVE',
        chemicalData: chemicalData,
        weatherData: weatherData,
        tidalData: tidalData,
        waterDepth: 10 // Would be calculated based on location
      };
      
      const createdSpill = await apiService.createSpill(spillData);
      
      if (onSpillCreated) {
        onSpillCreated(createdSpill);
      }
      
      // Navigate to map to show the new spill
      navigate('/map');
      
    } catch (error) {
      console.error('Error creating spill:', error);
      alert('Failed to create spill report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !selectedLocation) {
      setFormErrors({ location: 'Please select a location on the map' });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="spill-form-container">
      {/* Progress Bar */}
      <div className="form-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          ></div>
        </div>
        <div className="progress-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. Location</div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. Details</div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. Review</div>
        </div>
      </div>

      {/* Step 1: Location Selection */}
      {currentStep === 1 && (
        <div className="form-step">
          <div className="step-header">
            <h2>Select Spill Location</h2>
            <p>Click on the map to mark the location of the chemical spill</p>
          </div>
          
          <div className="map-container">
            <BaseMap 
              onPlaceSelected={handleLocationSelected}
              height="500px"
            />
          </div>
          
          {selectedLocation && (
            <div className="location-info">
              <h3>Selected Location</h3>
              <p><strong>Latitude:</strong> {selectedLocation.lat.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {selectedLocation.lng.toFixed(6)}</p>
              
              {weatherData && (
                <div className="environmental-data">
                  <h4>Current Weather</h4>
                  <p>{weatherData.temperature}°{weatherData.temperatureUnit}, {weatherData.shortForecast}</p>
                  <p>Wind: {weatherData.windSpeed} {weatherData.windDirection}</p>
                </div>
              )}
              
              {tidalData && (
                <div className="environmental-data">
                  <h4>Tidal Information</h4>
                  <p>Current Level: {tidalData.currentLevel}</p>
                  <p>Station: {tidalData.station}</p>
                </div>
              )}
            </div>
          )}
          
          {formErrors.location && <div className="error-message">{formErrors.location}</div>}
          
          <div className="step-actions">
            <button 
              className="btn btn-primary btn-lg"
              onClick={nextStep}
              disabled={!selectedLocation}
            >
              Next: Enter Details
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Spill Details */}
      {currentStep === 2 && (
        <div className="form-step">
          <div className="step-header">
            <h2>Spill Details</h2>
            <p>Provide information about the chemical spill</p>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Incident Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${formErrors.name ? 'error' : ''}`}
                placeholder="e.g., Oil Spill at Dock 5"
              />
              {formErrors.name && <div className="error-message">{formErrors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Chemical Type *</label>
              <input
                type="text"
                name="chemicalType"
                value={formData.chemicalType}
                onChange={handleInputChange}
                className={`form-input ${formErrors.chemicalType ? 'error' : ''}`}
                placeholder="e.g., Crude Oil, Benzene, etc."
              />
              {formErrors.chemicalType && <div className="error-message">{formErrors.chemicalType}</div>}
              {loading && formData.chemicalType && <div className="loading-text">Fetching chemical data...</div>}
            </div>

            <div className="form-group">
              <label className="form-label">CAS Number (if known)</label>
              <input
                type="text"
                name="casNumber"
                value={formData.casNumber}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., 71-43-2"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Source *</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className={`form-input ${formErrors.source ? 'error' : ''}`}
              >
                <option value="">Select source...</option>
                <option value="Industrial Facility">Industrial Facility</option>
                <option value="Transportation Accident">Transportation Accident</option>
                <option value="Pipeline Leak">Pipeline Leak</option>
                <option value="Ship/Vessel">Ship/Vessel</option>
                <option value="Storage Tank">Storage Tank</option>
                <option value="Unknown">Unknown</option>
                <option value="Other">Other</option>
              </select>
              {formErrors.source && <div className="error-message">{formErrors.source}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Volume Known? *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="volumeKnown"
                    value="yes"
                    checked={formData.volumeKnown === 'yes'}
                    onChange={handleInputChange}
                  />
                  Yes - I know the exact volume
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="volumeKnown"
                    value="no"
                    checked={formData.volumeKnown === 'no'}
                    onChange={handleInputChange}
                  />
                  No - I can only estimate
                </label>
              </div>
            </div>

            {formData.volumeKnown === 'yes' ? (
              <div className="form-group">
                <label className="form-label">Volume (Liters) *</label>
                <input
                  type="number"
                  name="volume"
                  value={formData.volume}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.volume ? 'error' : ''}`}
                  placeholder="Enter volume in liters"
                  min="0"
                />
                {formErrors.volume && <div className="error-message">{formErrors.volume}</div>}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Estimated Volume (Liters) *</label>
                <select
                  name="estimatedVolume"
                  value={formData.estimatedVolume}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.estimatedVolume ? 'error' : ''}`}
                >
                  <option value="">Select estimate...</option>
                  <option value="100">Small (&lt; 100L)</option>
                  <option value="1000">Medium (100-1,000L)</option>
                  <option value="10000">Large (1,000-10,000L)</option>
                  <option value="50000">Very Large (&gt; 10,000L)</option>
                </select>
                {formErrors.estimatedVolume && <div className="error-message">{formErrors.estimatedVolume}</div>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows="4"
                placeholder="Describe the incident, circumstances, and any additional relevant information..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reporter Name *</label>
              <input
                type="text"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleInputChange}
                className={`form-input ${formErrors.reporterName ? 'error' : ''}`}
                placeholder="Your full name"
              />
              {formErrors.reporterName && <div className="error-message">{formErrors.reporterName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Contact Information *</label>
              <input
                type="text"
                name="reporterContact"
                value={formData.reporterContact}
                onChange={handleInputChange}
                className={`form-input ${formErrors.reporterContact ? 'error' : ''}`}
                placeholder="Phone number or email"
              />
              {formErrors.reporterContact && <div className="error-message">{formErrors.reporterContact}</div>}
            </div>
          </div>

          {/* Chemical Data Display */}
          {chemicalData && (
            <div className="chemical-info-panel">
              <h3>Chemical Information</h3>
              <div className="chemical-data">
                <p><strong>IUPAC Name:</strong> {chemicalData.iupacName}</p>
                <p><strong>Molecular Weight:</strong> {chemicalData.molecularWeight}</p>
                <p><strong>Hazard Classification:</strong> {chemicalData.hazardClass}</p>
                {chemicalData.synonyms && chemicalData.synonyms.length > 0 && (
                  <p><strong>Synonyms:</strong> {chemicalData.synonyms.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          <div className="step-actions">
            <button 
              className="btn btn-secondary"
              onClick={prevStep}
            >
              Back
            </button>
            <button 
              className="btn btn-primary btn-lg"
              onClick={nextStep}
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review and Submit */}
      {currentStep === 3 && (
        <div className="form-step">
          <div className="step-header">
            <h2>Review and Submit</h2>
            <p>Please review all information before submitting the spill report</p>
          </div>
          
          <div className="review-panel">
            <div className="review-section">
              <h3>Location</h3>
              <p><strong>Coordinates:</strong> {formData.latitude}, {formData.longitude}</p>
              {weatherData && <p><strong>Weather:</strong> {weatherData.temperature}°{weatherData.temperatureUnit}, {weatherData.shortForecast}</p>}
              {tidalData && <p><strong>Tide Level:</strong> {tidalData.currentLevel}</p>}
            </div>

            <div className="review-section">
              <h3>Spill Information</h3>
              <p><strong>Incident:</strong> {formData.name}</p>
              <p><strong>Chemical:</strong> {formData.chemicalType}</p>
              {formData.casNumber && <p><strong>CAS Number:</strong> {formData.casNumber}</p>}
              <p><strong>Source:</strong> {formData.source}</p>
              <p><strong>Volume:</strong> {formData.volumeKnown === 'yes' ? formData.volume : formData.estimatedVolume}L {formData.volumeKnown === 'no' ? '(estimated)' : ''}</p>
              <p><strong>Priority:</strong> {formData.priority}</p>
              {formData.description && <p><strong>Description:</strong> {formData.description}</p>}
            </div>

            <div className="review-section">
              <h3>Reporter Information</h3>
              <p><strong>Name:</strong> {formData.reporterName}</p>
              <p><strong>Contact:</strong> {formData.reporterContact}</p>
            </div>

            {chemicalData && (
              <div className="review-section">
                <h3>Chemical Properties</h3>
                <p><strong>IUPAC Name:</strong> {chemicalData.iupacName}</p>
                <p><strong>Molecular Weight:</strong> {chemicalData.molecularWeight}</p>
                <p><strong>Hazard Class:</strong> {chemicalData.hazardClass}</p>
              </div>
            )}
          </div>

          <div className="step-actions">
            <button 
              className="btn btn-secondary"
              onClick={prevStep}
            >
              Back
            </button>
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpillForm;