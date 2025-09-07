import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React - using CDN URLs as fallback
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Spill icon with different color
const SpillIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjZGMyNjI2Ii8+Cjwvc3ZnPgo=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to programmatically change the map's view
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Component to add dispersion overlay
function DispersionOverlay({ selectedSpill, showDispersion }) {
  const map = useMap();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!selectedSpill || !showDispersion) {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    // Create a simple circle overlay to simulate dispersion
    const center = [selectedSpill.latitude, selectedSpill.longitude];
    const radius = Math.min(selectedSpill.volume / 100, 5000); // Radius based on volume

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current);
    }

    overlayRef.current = L.circle(center, {
      color: '#dc2626',
      fillColor: '#dc2626',
      fillOpacity: 0.3,
      radius: radius
    }).addTo(map);

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
      }
    };
  }, [selectedSpill, showDispersion, map]);

  return null;
}

function InteractiveMap({ spills = [], selectedSpill, onSpillSelect, showDispersion = true }) {
  const defaultPosition = [29.76, -95.36]; // Houston
  const defaultZoom = 8;

  const mapCenter = selectedSpill && selectedSpill.latitude && selectedSpill.longitude
    ? [parseFloat(selectedSpill.latitude), parseFloat(selectedSpill.longitude)]
    : defaultPosition;

  const mapZoom = selectedSpill ? 13 : defaultZoom;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Render markers for each spill */}
      {spills.map(spill => {
        const lat = parseFloat(spill.latitude);
        const lng = parseFloat(spill.longitude);
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {
          return null;
        }

        return (
          <Marker
            key={spill.id}
            position={[lat, lng]}
            icon={SpillIcon}
            eventHandlers={{
              click: () => {
                if (onSpillSelect) {
                  onSpillSelect(spill);
                }
              },
            }}
          >
            <Popup maxWidth={300}>
              <div className="spill-popup">
                <h3>{spill.name}</h3>
                <div className="popup-details">
                  <p><strong>Chemical:</strong> {spill.chemicalType}</p>
                  <p><strong>Volume:</strong> {spill.volume?.toLocaleString()} L</p>
                  <p><strong>Status:</strong> 
                    <span className={`status-badge status-${spill.status?.toLowerCase()}`}>
                      {spill.status}
                    </span>
                  </p>
                  <p><strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}</p>
                  <p><strong>Coordinates:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}</p>
                </div>
                <div className="popup-actions">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onSpillSelect && onSpillSelect(spill)}
                  >
                    Select Spill
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Component to change view when spill is selected */}
      <ChangeView center={mapCenter} zoom={mapZoom} />
      
      {/* Dispersion overlay */}
      <DispersionOverlay selectedSpill={selectedSpill} showDispersion={showDispersion} />
    </MapContainer>
  );
}

export default InteractiveMap;