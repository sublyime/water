import React from 'react';

function IncidentDetails({ location }) {
  return (
    <div>
      <h3>Incident Details</h3>
      {location ? (
        <p>Spill Location: Lat {location.lat.toFixed(4)}, Lng {location.lng.toFixed(4)}</p>
      ) : (
        <p>Select a location on the map to start.</p>
      )}
      {/* Add form for chemical type, volume, etc., and button to trigger modeling */}
    </div>
  );
}

export default IncidentDetails;
