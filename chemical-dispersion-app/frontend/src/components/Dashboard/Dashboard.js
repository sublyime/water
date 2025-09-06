// src/components/Dashboard/Dashboard.js (Assumed minimal; provide placeholder)
import React from 'react';

function Dashboard({ spills, onSpillSelect, onCreate }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => onCreate({ name: 'New Spill', chemicalType: 'Oil', volume: 100, latitude: 0, longitude: 0, spillTime: new Date().toISOString(), waterDepth: 1 })}>
        Create Sample Spill
      </button>
      <ul>
        {spills.map(spill => (
          <li key={spill.id} onClick={() => onSpillSelect(spill)} style={{ cursor: 'pointer' }}>
            {spill.name} - {spill.chemicalType} - {spill.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
