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
        <label>Simulation Hours</label>
        <select
          className="control-select"
          value={simulationHours}
          onChange={(e) => onSimulationHoursChange(parseInt(e.target.value))}
        >
          <option value={6}>6 hours</option>
          <option value={12}>12 hours</option>
          <option value={24}>24 hours</option>
          <option value={48}>48 hours</option>
          <option value={72}>72 hours</option>
        </select>
      </div>
      <div className="control-group">
        <label>Show Dispersion</label>
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={showDispersion}
            onChange={onShowDispersionToggle}
          />
          Display on Map
        </label>
      </div>
      <button
        className="btn btn-primary"
        onClick={onCalculateDispersion}
        disabled={isCalculating || !hasSelectedSpill}
      >
        {isCalculating ? 'Calculating...' : 'Run Simulation'}
      </button>
    </div>
  );
};

export default MapControls;
