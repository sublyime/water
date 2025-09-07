import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
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

function DispersionMap({ spills = [], selectedSpill, onSpillSelect, calculateDispersion }) {
    const [dispersionData, setDispersionData] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState(null);
    const [mapCenter] = useState([29.7604, -95.3698]); // Houston, TX
    const calculationRef = useRef(null);
    const hasCalculatedRef = useRef(new Set()); // Track calculated spills
    const lastCalculationRef = useRef(null);

    useEffect(() => {
        // Only calculate if we have a selected spill and haven't calculated it recently
        if (selectedSpill?.id && 
            !hasCalculatedRef.current.has(selectedSpill.id) && 
            !isCalculating &&
            lastCalculationRef.current !== selectedSpill.id) {
            
            handleCalculateDispersion(selectedSpill.id);
        }
    }, [selectedSpill?.id]); // Only depend on spill ID

    const handleCalculateDispersion = async (spillId) => {
        // Prevent multiple calculations for the same spill
        if (isCalculating || 
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
            hasCalculatedRef.current.add(spillId); // Mark as calculated
            
            console.log(`[SUCCESS] Dispersion calculation completed for ${spillId}`);
        } catch (error) {
            console.error('Dispersion calculation failed:', error);
            setError('Failed to calculate dispersion. Please try again.');
            hasCalculatedRef.current.delete(spillId); // Allow retry
        } finally {
            setIsCalculating(false);
        }
    };

    const handleManualCalculation = () => {
        if (selectedSpill?.id) {
            // Force recalculation by removing from calculated set
            hasCalculatedRef.current.delete(selectedSpill.id);
            lastCalculationRef.current = null;
            handleCalculateDispersion(selectedSpill.id);
        }
    };

    const getMarkerColor = (spill) => {
        if (spill.status === 'ACTIVE') return 'red';
        if (spill.status === 'CONTAINED') return 'orange';
        if (spill.status === 'CLEANED_UP') return 'green';
        return 'gray';
    };

    const createCustomIcon = (color) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    };

    return (
        <div className="dispersion-map">
            <div className="map-header">
                <h2>Chemical Dispersion Map</h2>
                <div className="map-controls">
                    {selectedSpill && (
                        <button 
                            onClick={handleManualCalculation}
                            disabled={isCalculating}
                            className="btn btn-primary"
                        >
                            {isCalculating ? 'Calculating...' : 'Recalculate Dispersion'}
                        </button>
                    )}
                    
                    <div className="map-legend">
                        <div className="legend-item">
                            <span className="legend-color active"></span>
                            <span>Active</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color contained"></span>
                            <span>Contained</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color cleaned"></span>
                            <span>Cleaned</span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="btn btn-sm">Dismiss</button>
                </div>
            )}

            {isCalculating && (
                <div className="calculation-status">
                    <div className="loading-spinner"></div>
                    <p>Calculating dispersion model for {selectedSpill?.name}...</p>
                </div>
            )}

            <div className="map-container">
                <MapContainer 
                    center={mapCenter} 
                    zoom={10} 
                    style={{ height: '500px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Render spill markers */}
                    {spills.map((spill) => (
                        <Marker
                            key={spill.id}
                            position={[spill.latitude, spill.longitude]}
                            icon={createCustomIcon(getMarkerColor(spill))}
                            eventHandlers={{
                                click: () => onSpillSelect(spill)
                            }}
                        >
                            <Popup>
                                <div className="spill-popup">
                                    <h4>{spill.name}</h4>
                                    <p><strong>Chemical:</strong> {spill.chemicalType}</p>
                                    <p><strong>Volume:</strong> {spill.volume}L</p>
                                    <p><strong>Status:</strong> {spill.status}</p>
                                    <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
                                    {spill.id === selectedSpill?.id && (
                                        <button 
                                            onClick={handleManualCalculation}
                                            disabled={isCalculating}
                                            className="btn btn-sm btn-primary"
                                        >
                                            Calculate Dispersion
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    
                    {/* Render dispersion circle if available */}
                    {selectedSpill && dispersionData && (
                        <Circle
                            center={[selectedSpill.latitude, selectedSpill.longitude]}
                            radius={1000} // 1km radius for visualization
                            pathOptions={{
                                color: 'red',
                                fillColor: 'red',
                                fillOpacity: 0.2
                            }}
                        >
                            <Popup>
                                <div className="dispersion-popup">
                                    <h4>Dispersion Zone</h4>
                                    <p><strong>Affected Area:</strong> {dispersionData.affectedAreaKm2 || 'N/A'} km²</p>
                                    <p><strong>Calculation Time:</strong> {dispersionData.calculationTime}</p>
                                </div>
                            </Popup>
                        </Circle>
                    )}
                </MapContainer>
            </div>

            {/* Spill Details Panel */}
            {selectedSpill && (
                <div className="spill-details-panel">
                    <h3>Selected Spill Details</h3>
                    <div className="spill-info-grid">
                        <div className="info-item">
                            <label>Name:</label>
                            <span>{selectedSpill.name}</span>
                        </div>
                        <div className="info-item">
                            <label>Chemical:</label>
                            <span>{selectedSpill.chemicalType}</span>
                        </div>
                        <div className="info-item">
                            <label>Volume:</label>
                            <span>{selectedSpill.volume}L</span>
                        </div>
                        <div className="info-item">
                            <label>Status:</label>
                            <span className={`status ${selectedSpill.status.toLowerCase()}`}>
                                {selectedSpill.status}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Location:</label>
                            <span>{selectedSpill.latitude.toFixed(4)}, {selectedSpill.longitude.toFixed(4)}</span>
                        </div>
                        <div className="info-item">
                            <label>Reported:</label>
                            <span>{new Date(selectedSpill.spillTime).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    {dispersionData && (
                        <div className="dispersion-results">
                            <h4>Dispersion Results</h4>
                            <div className="results-grid">
                                <div className="result-item">
                                    <label>Calculation Time:</label>
                                    <span>{dispersionData.calculationTime}</span>
                                </div>
                                <div className="result-item">
                                    <label>Affected Area:</label>
                                    <span>{dispersionData.affectedAreaKm2 || 0} km²</span>
                                </div>
                                <div className="result-item">
                                    <label>Grid Size:</label>
                                    <span>{dispersionData.dispersionGrid?.gridSize || 100}x{dispersionData.dispersionGrid?.gridSize || 100}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default DispersionMap;
