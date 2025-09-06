import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard/Dashboard';
import SpillForm from './components/Forms/SpillForm';
import WeatherPanel from './components/Weather/WeatherPanel';
import BaseMap from './components/BaseMap/BaseMap';
import SlidingPanel from './components/SlidingPanel/SlidingPanel';
import { apiService } from './services/api';
import './App.css';

function App() {
  const [activeSpills, setActiveSpills] = useState([]);
  const [selectedSpill, setSelectedSpill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadActiveSpills();
  }, []);

  const loadActiveSpills = async () => {
    try {
      setLoading(true);
      const spills = await apiService.getAllSpills();
      setActiveSpills(spills.filter(spill => spill.status === 'ACTIVE'));
    } catch (error) {
      console.error('Error loading spills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpillCreated = (newSpill) => {
    setActiveSpills(prev => [...prev, newSpill]);
    setSelectedSpill(newSpill);
  };

  const handleSpillSelected = (spill) => {
    setSelectedSpill(spill);
  };

  const handleLocationSelect = (latlng) => {
    setSelectedLocation(latlng);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/dashboard" element={<Dashboard spills={activeSpills} onSpillSelect={handleSpillSelected} onCreate={handleSpillCreated} />} />
        <Route path="/spill" element={<SpillForm onSpillCreated={handleSpillCreated} />} />
        <Route path="/weather" element={<WeatherPanel />} />
        <Route path="/map" element={
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: '1', position: 'relative' }}>
              <BaseMap onPlaceSelected={handleLocationSelect} />
            </div>
            <div style={{ width: '300px', position: 'relative' }}>
              <SlidingPanel location={selectedLocation} />
            </div>
          </div>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
