// src/components/Map/InteractiveMap.js
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Helper component to programmatically change the map's view
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function InteractiveMap({ spills, selectedSpill, onSpillSelect }) {
  const defaultPosition = [29.76, -95.36]; // Default center (Houston)
  const defaultZoom = 8;

  const mapCenter = selectedSpill
    ? [selectedSpill.latitude, selectedSpill.longitude]
    : defaultPosition;

  return (
    <MapContainer
      center={mapCenter}
      zoom={selectedSpill ? 13 : defaultZoom}
      // Use 100% height to fit within the parent grid container
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Render a marker for each spill */}
      {spills.map(spill => (
        <Marker
          key={spill.id}
          position={[spill.latitude, spill.longitude]}
          eventHandlers={{
            click: () => {
              onSpillSelect(spill);
            },
          }}
        >
          <Popup>
            <b>{spill.name}</b><br />
            {spill.chemicalType}
          </Popup>
        </Marker>
      ))}

      {/* This component pans the map when a spill is selected */}
      <ChangeView center={mapCenter} zoom={selectedSpill ? 13 : defaultZoom} />
    </MapContainer>
  );
}

export default InteractiveMap;