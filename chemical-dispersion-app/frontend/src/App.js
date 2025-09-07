import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import SpillForm from './components/Forms/SpillForm';
import WeatherPanel from './components/Weather/WeatherPanel';
import DispersionMap from './components/Map/DispersionMap';
import { apiService } from './services/api';
import './App.css';

function App() {
  const [activeSpills, setActiveSpills] = useState([]);
  const [selectedSpill, setSelectedSpill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  useEffect(() => {
    loadActiveSpills();
  }, []);

  const loadActiveSpills = async () => {
    try {
      setLoading(true);
      const spills = await apiService.getAllSpills();
      const activeSpillsList = spills.filter(spill => spill.status === 'ACTIVE');
      setActiveSpills(activeSpillsList);
      
      // Check for emergency level spills
      const emergencySpills = activeSpillsList.filter(spill => 
        spill.volume > 10000 || spill.chemicalType.toLowerCase().includes('toxic')
      );
      if (emergencySpills.length > 0) {
        setEmergencyAlert(`⚠️ ${emergencySpills.length} emergency level spill(s) detected!`);
      }
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

  const handleCalculateDispersion = async (spillId, simulationHours = 24) => {
    try {
      const result = await apiService.calculateDispersion(spillId, simulationHours);
      console.log('Dispersion calculation result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating dispersion:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>Loading Chemical Dispersion System...</h2>
        <p>Initializing monitoring systems</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {emergencyAlert && (
          <div className="emergency-banner">
            <div className="banner-content">
              <span className="emergency-icon">🚨</span>
              {emergencyAlert}
              <button 
                className="banner-close" 
                onClick={() => setEmergencyAlert(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <span className="title-icon">💧</span>
              Water Dispersion Monitor
            </h1>
            <nav className="main-nav">
              <button className="nav-btn">🏠 Dashboard</button>
              <button className="nav-btn">🗺️ Map</button>
              <button className="nav-btn">📊 Reports</button>
              <button className="nav-btn">⚙️ Settings</button>
            </nav>
            <div className="header-status">
              <div className="active-spills-indicator">
                <div className="status-dot"></div>
                {activeSpills.length} Active Spills
              </div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  spills={activeSpills} 
                  onSpillSelect={handleSpillSelected} 
                  onCreate={handleSpillCreated} 
                />
              } 
            />
            <Route 
              path="/spill" 
              element={<SpillForm onSpillCreated={handleSpillCreated} />} 
            />
            <Route path="/weather" element={<WeatherPanel />} />
            <Route 
              path="/map" 
              element={
                <DispersionMap
                  spills={activeSpills}
                  selectedSpill={selectedSpill}
                  onSpillSelect={handleSpillSelected}
                  calculateDispersion={handleCalculateDispersion}
                />
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

        <div className="floating-actions">
          <button className="fab primary" title="New Incident">
            +
          </button>
          <button className="fab secondary" title="Help">
            ?
          </button>
        </div>
      </div>
    </Router>
  );
}

export default App;