import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import MapControls from './MapControls';
import './DispersionMap.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom spill icon
const spillIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNEQzI2MjYiLz4KPHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0ieC1vZmZzZXQ6IDZweDsgeTpvZmZzZXQ6IDZweDsiPgo8cGF0aCBkPSJNNiAyVjEwTTIgNkgxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPgo=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const DispersionMap = ({ spills, selectedSpill, onSpillSelected }) => {
  const [map, setMap] = useState(null);
  const [dispersionData, setDispersionData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDispersion, setShowDispersion] = useState(true);
  const [simulationHours, setSimulationHours] = useState(24);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // NYC default
  const [zoom, setZoom] = useState(8);

  useEffect(() => {
    if (selectedSpill) {
      const lat = parseFloat(selectedSpill.latitude);
      const lng = parseFloat(selectedSpill.longitude);
      setMapCenter([lat, lng]);
      setZoom(12);
      
      // Auto-calculate dispersion for selected spill
      calculateDispersion(selectedSpill.id);
    }
  }, [selectedSpill]);

  const calculateDispersion = async (spillId) => {
    if (isCalculating) return;
    
    setIsCalculating(true);
    toast.loading('Calculating chemical dispersion...', { id: 'dispersion-calc' });
    
    try {
      const result = await apiService.calculateDispersion(spillId, simulationHours);
      setDispersionData(result);
      toast.success('Dispersion calculation completed!', { id: 'dispersion-calc' });
    } catch (error) {
      console.error('Error calculating dispersion:', error);
      toast.error('Failed to calculate dispersion: ' + error.message, { id: 'dispersion-calc' });
    } finally {
      setIsCalculating(false);
    }
  };

  const renderSpillMarkers = () => {
    return spills.map(spill => (
      <Marker
        key={spill.id}
        position={[parseFloat(spill.latitude), parseFloat(spill.longitude)]}
        icon={spillIcon}
        eventHandlers={{
          click: () => onSpillSelected(spill)
        }}
      >
        <Popup>
          <div className="spill-popup">
            <h3>{spill.name}</h3>
            <div className="popup-details">
              <p><strong>Chemical:</strong> {spill.chemicalType}</p>
              <p><strong>Volume:</strong> {spill.volume.toLocaleString()} L</p>
              <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge status-${spill.status.toLowerCase()}`}>
                  {spill.status}
                </span>
              </p>
            </div>
            <div className="popup-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => calculateDispersion(spill.id)}
                disabled={isCalculating}
              >
                {isCalculating ? 'Calculating...' : 'Calculate Dispersion'}
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    ));
  };

  const renderDispersionPlume = () => {
    if (!showDispersion || !dispersionData) return null;

    return (
      <>
        {/* Concentration Grid Points */}
        {dispersionData.concentrationGrid?.map((point, index) => {
          const radius = Math.max(10, Math.min(100, point.concentration * 1000)); // Scale radius
          const opacity = Math.min(0.7, point.concentration / dispersionData.maxConcentration);
          
          return (
            <Circle
              key={`conc-${index}`}
              center={[parseFloat(point.latitude), parseFloat(point.longitude)]}
              radius={radius}
              fillColor={getConcentrationColor(point.concentration, dispersionData.maxConcentration)}
              color={getConcentrationColor(point.concentration, dispersionData.maxConcentration)}
              fillOpacity={opacity}
              opacity={0.6}
              weight={1}
            />
          );
        })}

        {/* Plume Contours */}
        {dispersionData.plumeContours?.map((contour, index) => {
          if (!contour.coordinates || contour.coordinates.length < 3) return null;
          
          const positions = contour.coordinates.map(coord => [
            parseFloat(coord.latitude),
            parseFloat(coord.longitude)
          ]);

          return (
            <Polygon
              key={`contour-${index}`}
              positions={positions}
              fillColor={getContourColor(contour.concentrationLevel)}
              color={getContourColor(contour.concentrationLevel)}
              fillOpacity={0.3}
              opacity={0.8}
              weight={2}
            />
          );
        })}
      </>
    );
  };

  const getConcentrationColor = (concentration, maxConcentration) => {
    const ratio = concentration / maxConcentration;
    
    if (ratio > 0.8) return '#8B0000'; // Dark red
    if (ratio > 0.6) return '#DC143C'; // Crimson
    if (ratio > 0.4) return '#FF6347'; // Tomato
    if (ratio > 0.2) return '#FFA500'; // Orange
    return '#FFFF00'; // Yellow
  };

  const getContourColor = (concentrationLevel) => {
    const level = parseFloat(concentrationLevel.split(' ')[0]);
    
    if (level >= 1000) return '#8B0000';
    if (level >= 100) return '#DC143C';
    if (level >= 10) return '#FF6347';
    return '#FFA500';
  };

  const MapEventHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      setMap(map);
    }, [map]);
    
    return null;
  };

  return (
    <div className="dispersion-map-container">
      <div className="map-header">
        <div className="map-title">
          <h2>🗺️ Dispersion Map</h2>
          <p>Real-time chemical spill tracking and dispersion modeling</p>
        </div>
        
        <MapControls
          simulationHours={simulationHours}
          onSimulationHoursChange={setSimulationHours}
          showDispersion={showDispersion}
          onShowDispersionToggle={setShowDispersion}
          onCalculateDispersion={() => selectedSpill && calculateDispersion(selectedSpill.id)}
          isCalculating={isCalculating}
          hasSelectedSpill={!!selectedSpill}
        />
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          className="dispersion-map"
          zoomControl={false}
        >
          <MapEventHandler />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {renderSpillMarkers()}
          {renderDispersionPlume()}
        </MapContainer>

        {/* Map Legend */}
        {dispersionData && showDispersion && (
          <div className="map-legend">
            <h4>Concentration Levels</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#8B0000' }}></div>
                <span>Very High (&gt;80%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#DC143C' }}></div>
                <span>High (60-80%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FF6347' }}></div>
                <span>Medium (40-60%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FFA500' }}></div>
                <span>Low (20-40%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#FFFF00' }}></div>
                <span>Very Low (&lt;20%)</span>
              </div>
            </div>
            
            {dispersionData.maxConcentration && (
              <div className="legend-stats">
                <p><strong>Max Concentration:</strong> {dispersionData.maxConcentration.toFixed(3)} mg/L</p>
                <p><strong>Affected Area:</strong> {dispersionData.affectedAreaKm2?.toFixed(2)} km²</p>
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isCalculating && (
          <div className="map-loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h3>Calculating Dispersion</h3>
              <p>Processing fluid dynamics and environmental data...</p>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spill List Sidebar */}
      <div className="spills-sidebar">
        <h3>Active Spills ({spills.length})</h3>
        <div className="spills-list">
          {spills.map(spill => (
            <div 
              key={spill.id}
              className={`spill-item ${selectedSpill?.id === spill.id ? 'selected' : ''}`}
              onClick={() => onSpillSelected(spill)}
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
                <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleDateString()}</p>
              </div>
              
              <div className="spill-actions">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    calculateDispersion(spill.id);
                  }}
                  disabled={isCalculating}
                >
                  Calculate
                </button>
              </div>
            </div>
          ))}
          
          {spills.length === 0 && (
            <div className="no-spills">
              <p>No active spills</p>
              <small>Click "New Incident" to report a spill</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispersionMap;