import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons (common React issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to handle map clicks and marker placement
function LocationMarker({ onLocationSelected }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelected(e.latlng);  // Pass location to parent
    },
  });

  return position === null ? null : <Marker position={position} />;
}

function BaseMap({ onPlaceSelected }) {
  return (
    <MapContainer
      center={[29.7604, -95.3698]}  // Default center (e.g., Houston area)
      zoom={10}
      style={{ height: '100vh', width: '100%' }}  // Full viewport map
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <LocationMarker onLocationSelected={onPlaceSelected} />
    </MapContainer>
  );
}

export default BaseMap;
