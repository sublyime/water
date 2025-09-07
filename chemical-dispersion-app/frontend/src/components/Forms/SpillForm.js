import React, { useState } from 'react';
import { apiService, apiUtils } from '../../services/api';

function SpillForm({ onSpillCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    chemicalType: '',
    volume: '',
    latitude: '',
    longitude: '',
    spillTime: new Date().toISOString().slice(0, 16),
    waterDepth: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const chemicalTypes = [
    'Crude Oil',
    'Refined Oil',
    'Gasoline',
    'Diesel',
    'Heavy Fuel Oil',
    'Chemical Solvent',
    'Toxic Chemical',
    'Unknown Petroleum Product',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const validation = apiUtils.validateSpillData(formData);
    setErrors(validation.errors.reduce((acc, error) => {
      const field = error.split(' ')[0].toLowerCase();
      acc[field] = error;
      return acc;
    }, {}));
    return validation.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      const spillData = {
        ...formData,
        volume: parseFloat(formData.volume),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        waterDepth: parseFloat(formData.waterDepth)
      };
      
      const newSpill = await apiService.createSpill(spillData);
      
      setSuccess(true);
      onSpillCreated(newSpill);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          name: '',
          chemicalType: '',
          volume: '',
          latitude: '',
          longitude: '',
          spillTime: new Date().toISOString().slice(0, 16),
          waterDepth: ''
        });
        setSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating spill:', error);
      setErrors({ submit: error.message || 'Failed to create spill report' });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setErrors(prev => ({ 
            ...prev, 
            location: 'Unable to get current location' 
          }));
        }
      );
    }
  };

  if (success) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="card-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: '#059669', marginBottom: '1rem' }}>
            Spill Report Submitted Successfully
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
            Your incident report has been created and emergency response teams have been notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Chemical Spill Report</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>
            Report a new chemical spill incident for immediate response
          </p>
        </div>
        
        <div className="card-content">
          <form onSubmit={handleSubmit}>
            {errors.submit && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                marginBottom: '1.5rem'
              }}>
                {errors.submit}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Incident Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Oil Spill - Gulf Coast"
                required
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="chemicalType">
                Chemical Type *
              </label>
              <select
                id="chemicalType"
                name="chemicalType"
                className="form-select"
                value={formData.chemicalType}
                onChange={handleChange}
                required
              >
                <option value="">Select chemical type...</option>
                {chemicalTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.chemicaltype && <div className="form-error">{errors.chemicaltype}</div>}
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="volume">
                  Volume (Liters) *
                </label>
                <input
                  type="number"
                  id="volume"
                  name="volume"
                  className="form-input"
                  value={formData.volume}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                  min="0"
                  step="0.1"
                  required
                />
                {errors.volume && <div className="form-error">{errors.volume}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="waterDepth">
                  Water Depth (meters) *
                </label>
                <input
                  type="number"
                  id="waterDepth"
                  name="waterDepth"
                  className="form-input"
                  value={formData.waterDepth}
                  onChange={handleChange}
                  placeholder="e.g., 15.5"
                  min="0"
                  step="0.1"
                  required
                />
                {errors.waterdepth && <div className="form-error">{errors.waterdepth}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="spillTime">
                Spill Time *
              </label>
              <input
                type="datetime-local"
                id="spillTime"
                name="spillTime"
                className="form-input"
                value={formData.spillTime}
                onChange={handleChange}
                required
              />
              {errors.spilltime && <div className="form-error">{errors.spilltime}</div>}
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="latitude">
                  Latitude *
                </label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  className="form-input"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 29.7604"
                  step="any"
                  required
                />
                {errors.latitude && <div className="form-error">{errors.latitude}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="longitude">
                  Longitude *
                </label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  className="form-input"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g., -95.3698"
                  step="any"
                  required
                />
                {errors.longitude && <div className="form-error">{errors.longitude}</div>}
              </div>
            </div>

            <div className="form-group">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={getCurrentLocation}
                style={{ marginBottom: '1rem' }}
              >
                📍 Use Current Location
              </button>
              {errors.location && <div className="form-error">{errors.location}</div>}
            </div>

            <div className="form-group" style={{ marginTop: '2rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Submitting Report...
                  </>
                ) : (
                  'Submit Spill Report'
                )}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>
              Emergency Notice
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#075985' }}>
              For immediate emergency response, call 911 or the National Response Center at 1-800-424-8802
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpillForm;