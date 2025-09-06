import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap, WMSTileLayer } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import MapControls from './MapControls';
import './DispersionMap.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom spill icon (base64 SVG for water drop with warning)
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
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [zoom, setZoom] = useState(8);

  useEffect(() => {
    if (selectedSpill) {
      const lat = parseFloat(selectedSpill.latitude);
      const lng = parseFloat(selectedSpill.longitude);
      setMapCenter([lat, lng]);
      setZoom(12);
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
          click: () => onSpillSelected(spill),
        }}
      >
        <Popup>
          <div className="spill-popup">
            <h3>{spill.name}</h3>
            <div className="popup-details">
              <p><strong>Chemical:</strong> {spill.chemicalType}</p>
              <p><strong>Volume:</strong> {spill.volume.toLocaleString()} L</p>
              <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
              <p><strong>Status:</strong> <span className={`status-badge status-${spill.status.toLowerCase()}`}>{spill.status}</span></p>
            </div>
            <div className="popup-actions">
              <button className="btn btn-sm btn-primary" onClick={() => calculateDispersion(spill.id)} disabled={isCalculating}>
                {isCalculating ? <span className="btn-spinner"></span> : 'Calculate Dispersion'}
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    ));
  };

  const renderDispersion = () => {
    if (!showDispersion || !dispersionData) return null;

    const contours = dispersionData.plumeContours.map(contour => (
      <Polygon
        key={contour.concentrationLevel}
        positions={contour.coordinates.map(point => [point.latitude, point.longitude])}
        pathOptions={{ color: getContourColor(contour.concentrationLevel), weight: 2, fillOpacity: 0.3 }}
      />
    ));

    return (
      <>
        {contours}
        {dispersionData.concentrationGrid.map((point, index) => (
          <Circle
            key={index}
            center={[point.latitude, point.longitude]}
            radius={Math.sqrt(point.concentration) * 10} // Scale radius by concentration
            pathOptions={{ color: getConcentrationColor(point.concentration), fillOpacity: 0.5 }}
          />
        ))}
      </>
    );
  };

  const getContourColor = (level) => {
    switch (level) {
      case '1.0 mg/L': return '#00ff00';
      case '10.0 mg/L': return '#ffff00';
      case '100.0 mg/L': return '#ff9900';
      case '1000.0 mg/L': return '#ff0000';
      default: return '#000000';
    }
  };

  const getConcentrationColor = (conc) => {
    if (conc < 1) return 'green';
    if (conc < 10) return 'yellow';
    if (conc < 100) return 'orange';
    return 'red';
  };

  return (
    <div className="dispersion-map-container">
      <div className="map-header">
        <div className="map-title">
          <h2>Spill Dispersion Map</h2>
          <p>Real-time water chemical spill tracking and dispersion modeling</p>
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
        <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} ref={setMap}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* QGIS WMS Layer for custom mapping */}
          <WMSTileLayer
            url="http://localhost:8888/?SERVICE=WMS" // Your QGIS server URL
            layers="water_dispersion_layer" // Your QGIS layer name
            format="image/png"
            transparent={true}
            version="1.3.0"
          />
          {renderSpillMarkers()}
          {renderDispersion()}
        </MapContainer>
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
        {dispersionData && (
          <div className="map-legend">
            <h4>Dispersion Legend</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'green' }}></div>
                Low Concentration (&lt;1 mg/L)
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'yellow' }}></div>
                Medium (1-10 mg/L)
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'orange' }}></div>
                High (10-100 mg/L)
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'red' }}></div>
                Critical (&gt;100 mg/L)
              </div>
            </div>
            <div className="legend-stats">
              <p><strong>Max Concentration:</strong> {dispersionData.maxConcentration.toFixed(3)} mg/L</p>
              <p><strong>Affected Area:</strong> {dispersionData.affectedAreaKm2?.toFixed(2)} km²</p>
            </div>
          </div>
        )}
      </div>
      <div className="spills-sidebar">
        <h3>Active Spills</h3>
        <div className="spills-list">
          {activeSpills.length === 0 ? (
            <div className="no-spills">
              <p>No active spills</p>
              <small>Click "New Incident" to report a spill</small>
            </div>
          ) : (
            activeSpills.map(spill => (
              <div
                key={spill.id}
                className={`spill-item ${selectedSpill?.id === spill.id ? 'selected' : ''}`}
                onClick={() => onSpillSelected(spill)}
              >
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
          )}
        </div>
      </div>
    </div>
  );
};

export default DispersionMap;
