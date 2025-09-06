// src/components/Map/DispersionMap.js (Reconstructed from fragments, fixed unused vars, added dependency to useEffect)
import React, { useEffect, useRef } from 'react';  // Removed unused useMap
import './DispersionMap.css';

function DispersionMap({ spills, selectedSpill, calculateDispersion }) {  // Assuming calculateDispersion prop
  const mapRef = useRef(null);  // Used ref for map container

  useEffect(() => {
    if (selectedSpill) {
      calculateDispersion(selectedSpill.id);  // Added to dependency
    }
  }, [selectedSpill, calculateDispersion]);  // Added missing dependency

  return (
    <div className="dispersion-map-container">
      <div className="map-header">
        <div className="map-title">
          <h2>Dispersion Map</h2>
          <p>Real-time water chemical spill tracking and dispersion modeling</p>
        </div>
      </div>
      <div className="map-wrapper">
        <div ref={mapRef} className="dispersion-map">
          {/* Integrate Leaflet or map library here */}
          {selectedSpill && (
            <div>
              <h3>Selected Spill: {selectedSpill.name}</h3>
              <p><strong>Chemical:</strong> {selectedSpill.chemicalType}</p>
              <p><strong>Volume:</strong> {selectedSpill.volume.toLocaleString()} L</p>
              <p><strong>Time:</strong> {new Date(selectedSpill.spillTime).toLocaleString()}</p>
              <p><strong>Status:</strong> {selectedSpill.status}</p>
              {/* Add max concentration, affected area if available */}
            </div>
          )}
          {!selectedSpill && (
            <div>No active spills. Click "New Incident" to report a spill.</div>
          )}
        </div>
      </div>
      <div className="spills-sidebar">
        <h3>Active Spills</h3>
        <div className="spills-list">
          {spills.length > 0 ? (
            spills.map(spill => (
              <div key={spill.id} className={`spill-item ${selectedSpill?.id === spill.id ? 'selected' : ''}`}>
                <div className="spill-header">
                  <h4>{spill.name}</h4>
                  <span className={`status-badge status-${spill.status.toLowerCase()}`}>{spill.status}</span>
                </div>
                <div className="spill-details">
                  <p><strong>Chemical:</strong> {spill.chemicalType}</p>
                  <p><strong>Volume:</strong> {spill.volume.toLocaleString()} L</p>
                  <p><strong>Location:</strong> {parseFloat(spill.latitude).toFixed(4)}, {parseFloat(spill.longitude).toFixed(4)}</p>
                  <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-spills">
              <p>No active spills</p>
              <small>Click "New Incident" to report a spill</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DispersionMap;
