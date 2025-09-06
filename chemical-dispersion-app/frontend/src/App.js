import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard/Dashboard';
import DispersionMap from './components/Map/DispersionMap';
import SpillForm from './components/Forms/SpillForm';
import WeatherPanel from './components/Weather/WeatherPanel';
import { apiService } from './services/api';
import './App.css';

function App() {
  const [activeSpills, setActiveSpills] = useState([]);
  const [selectedSpill, setSelectedSpill] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="loading">Loading...</div>;  // Completed return statement
  }

  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/dashboard" element={<Dashboard spills={activeSpills} onSpillSelect={handleSpillSelected} onCreate={handleSpillCreated} />} />
        <Route path="/map" element={<DispersionMap spills={activeSpills} selectedSpill={selectedSpill} />} />
        <Route path="/spill" element={<SpillForm onSpillCreated={handleSpillCreated} />} />
        <Route path="/weather" element={<WeatherPanel />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
