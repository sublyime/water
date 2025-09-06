// src/components/Forms/SpillForm.js (Completed from snippet, added basic form logic)
import React from 'react';

function SpillForm({ onSpillCreated }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Sample data - replace with actual form handling
    const newSpill = { id: Date.now(), name: 'Test Spill', chemicalType: 'Oil', volume: 100, latitude: 0, longitude: 0, spillTime: new Date().toISOString(), waterDepth: 1 };
    onSpillCreated(newSpill);
  };

  return (
    <div>
      <h1>Spill Form</h1>
      <form onSubmit={handleSubmit}>
        <button type="submit">Submit Test Form</button>
      </form>
    </div>
  );
}

export default SpillForm;
