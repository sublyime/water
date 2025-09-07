import React, { useState, useEffect } from 'react';
import './DispersionMap.css';
import MapControls from './MapControls';
import InteractiveMap from './InteractiveMap';

function DispersionMap({ spills, selectedSpill, onSpillSelect, calculateDispersion }) {
  // State for map controls
  const [simulationHours, setSimulationHours] = useState(24);
  const [showDispersion, setShowDispersion] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // Trigger calculation when the selected spill or hours change
  useEffect(() => {
    if (selectedSpill && calculateDispersion) {
      setIsCalculating(true);
      calculateDispersion(selectedSpill.id, simulationHours)
        .catch(error => {
          console.error('Dispersion calculation failed:', error);
        })
        .finally(() => {
          setIsCalculating(false);
        });
    }
  }, [selectedSpill, simulationHours, calculateDispersion]);

  const handleCalculateDispersion = () => {
    if (selectedSpill && calculateDispersion) {
      setIsCalculating(true);
      calculateDispersion(selectedSpill.id, simulationHours)
        .catch(error => {
          console.error('Dispersion calculation failed:', error);
        })
        .finally(() => {
          setIsCalculating(false);
        });
    }
  };

  return (
    <div className="dispersion-map-container">
      <div className="map-header">
        <div className="map-title">
          <h2>Dispersion Map</h2>
          <p>Real-time water chemical spill tracking and dispersion modeling</p>
        </div>
        <MapControls
          simulationHours={simulationHours}
          onSimulationHoursChange={setSimulationHours}
          showDispersion={showDispersion}
          onShowDispersionToggle={() => setShowDispersion(!showDispersion)}
          onCalculateDispersion={handleCalculateDispersion}
          isCalculating={isCalculating}
          hasSelectedSpill={!!selectedSpill}
        />
      </div>

      <div className="map-wrapper">
        {isCalculating && (
          <div className="map-loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h3>Calculating Dispersion</h3>
              <p>Running fluid dynamics simulation...</p>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        )}
        
        <InteractiveMap
          spills={spills}
          selectedSpill={selectedSpill}
          onSpillSelect={onSpillSelect}
          showDispersion={showDispersion}
        />
        
        {selectedSpill && (
          <div className="map-legend">
            <h4>Concentration Levels</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#dc2626' }}></div>
                <span>High (&gt;1000 ppm)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ea580c' }}></div>
                <span>Medium (100-1000 ppm)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#d97706' }}></div>
                <span>Low (10-100 ppm)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#65a30d' }}></div>
                <span>Trace (&lt;10 ppm)</span>
              </div>
            </div>
            <div className="legend-stats">
              <p><strong>Selected Spill:</strong> {selectedSpill.name}</p>
              <p><strong>Chemical:</strong> {selectedSpill.chemicalType}</p>
              <p><strong>Volume:</strong> {selectedSpill.volume.toLocaleString()} L</p>
              <p><strong>Status:</strong> {selectedSpill.status}</p>
            </div>
          </div>
        )}
      </div>

      <div className="spills-sidebar">
        <h3>Active Spills ({spills.length})</h3>
        <div className="spills-list">
          {spills.length > 0 ? (
            spills.map(spill => (
              <div 
                key={spill.id} 
                className={`spill-item ${selectedSpill?.id === spill.id ? 'selected' : ''}`}
                onClick={() => onSpillSelect(spill)}
              >
                <div className="spill-header">
                  <h4>{spill.name}</h4>
                  <span className={`status-badge status-${spill.status.toLowerCase()}`}>
                    {spill.status}
                  </span>
                </div>
                <div className="spill-details">
                  <p><strong>Chemical:</strong> {spill.chemicalType}</p>
                  <p><strong>Volume:</strong> {spill.volume.toLocaleString()} L</p>
                  <p><strong>Location:</strong> {parseFloat(spill.latitude).toFixed(4)}, {parseFloat(spill.longitude).toFixed(4)}</p>
                  <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
                </div>
                <div className="spill-actions">
                  {selectedSpill?.id === spill.id ? (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCalculateDispersion();
                      }}
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <>
                          <div className="btn-spinner"></div>
                          Calculating...
                        </>
                      ) : (
                        'Calculate'
                      )}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpillSelect(spill);
                      }}
                    >
                      Select
                    </button>
                  )}
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