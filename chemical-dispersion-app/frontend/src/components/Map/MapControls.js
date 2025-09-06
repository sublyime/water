import React from 'react';

const MapControls = ({
  simulationHours,
  onSimulationHoursChange,
  showDispersion,
  onShowDispersionToggle,
  onCalculateDispersion,
  isCalculating,
  hasSelectedSpill
}) => {
  return (
    <div className="map-controls">
      <div className="control-group">
        <label htmlFor="simulation-hours">Simulation Hours:</label>
        <select
          id="simulation-hours"
          value={simulationHours}
          onChange={(e) => onSimulationHoursChange(parseInt(e.target.value))}
          className="control-select"
        >
          <option value={6}>6 Hours</option>
          <option value={12}>12 Hours</option>
          <option value={24}>24 Hours</option>
          <option value={48}>48 Hours</option>
          <option value={72}>72 Hours</option>
        </select>
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={showDispersion}
            onChange={(e) => onShowDispersionToggle(e.target.checked)}
          />
          <span className="checkmark"></span>
          Show Dispersion
        </label>
      </div>

      <div className="control-group">
        <button
          className="btn btn-primary"
          onClick={onCalculateDispersion}
          disabled={isCalculating || !hasSelectedSpill}
        >
          {isCalculating ? (
            <>
              <div className="btn-spinner"></div>
              Calculating...
            </>
          ) : (
            <>
              🧮 Calculate Dispersion
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MapControls;