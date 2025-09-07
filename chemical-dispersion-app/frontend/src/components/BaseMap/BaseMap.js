import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks and marker placement
function LocationMarker({ onLocationSelected, position }) {
  const [clickedPosition, setClickedPosition] = useState(position);

  const map = useMapEvents({
    click(e) {
      const newPosition = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setClickedPosition(newPosition);
      if (onLocationSelected) {
        onLocationSelected(newPosition);
      }
    },
  });

  return clickedPosition ? (
    <Marker position={[clickedPosition.lat, clickedPosition.lng]}>
    </Marker>
  ) : null;
}

function BaseMap({ 
  onPlaceSelected, 
  center = [29.7604, -95.3698], 
  zoom = 10,
  height = '100vh',
  allowMarkerPlacement = true 
}) {
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleLocationSelected = useCallback((location) => {
    setSelectedLocation(location);
    if (onPlaceSelected) {
      onPlaceSelected(location);
    }
  }, [onPlaceSelected]);

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {allowMarkerPlacement && (
          <LocationMarker 
            onLocationSelected={handleLocationSelected} 
            position={selectedLocation}
          />
        )}
      </MapContainer>

      {/* Location info overlay */}
      {selectedLocation && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '250px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            Selected Location
          </h4>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Latitude:</strong> {selectedLocation.lat.toFixed(6)}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Longitude:</strong> {selectedLocation.lng.toFixed(6)}
          </p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => onPlaceSelected && onPlaceSelected(selectedLocation)}
            >
              Confirm Location
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedLocation(null);
                onPlaceSelected && onPlaceSelected(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#666',
        zIndex: 1000
      }}>
        Click on the map to select a location for the spill
      </div>
    </div>
  );
}

export default BaseMap;