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
  const [currentView, setCurrentView] = useState('dashboard');

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
    setCurrentView('map');
  };

  const handleSpillSelected = (spill) => {
    setSelectedSpill(spill);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <h2>Loading Chemical Dispersion Monitor...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <span className="title-icon">🌊</span>
              Chemical Dispersion Monitor
            </h1>
            
            <nav className="main-nav">
              <button 
                className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                📊 Dashboard
              </button>
              <button 
                className={`nav-btn ${currentView === 'map' ? 'active' : ''}`}
                onClick={() => setCurrentView('map')}
              >
                🗺️ Map View
              </button>
              <button 
                className={`nav-btn ${currentView === 'create' ? 'active' : ''}`}
                onClick={() => setCurrentView('create')}
              >
                ➕ New Incident
              </button>
              <button 
                className={`nav-btn ${currentView === 'weather' ? 'active' : ''}`}
                onClick={() => setCurrentView('weather')}
              >
                🌤️ Weather
              </button>
            </nav>
            
            <div className="header-status">
              <div className="active-spills-indicator">
                <span className="status-dot"></span>
                {activeSpills.length} Active Spills
              </div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  spills={activeSpills}
                  onSpillSelected={handleSpillSelected}
                  selectedSpill={selectedSpill}
                  onRefresh={loadActiveSpills}
                />
              } 
            />
            
            <Route 
              path="/map" 
              element={
                <DispersionMap 
                  spills={activeSpills}
                  selectedSpill={selectedSpill}
                  onSpillSelected={handleSpillSelected}
                />
              } 
            />
            
            <Route 
              path="/create" 
              element={
                <SpillForm 
                  onSpillCreated={handleSpillCreated}
                />
              } 
            />
            
            <Route 
              path="/weather" 
              element={
                <WeatherPanel 
                  selectedSpill={selectedSpill}
                />
              } 
            />
          </Routes>
        </main>

        {/* Floating Action Buttons */}
        {currentView !== 'create' && (
          <div className="floating-actions">
            <button 
              className="fab primary"
              onClick={() => setCurrentView('create')}
              title="Report New Spill"
            >
              ➕
            </button>
            
            <button 
              className="fab secondary"
              onClick={loadActiveSpills}
              title="Refresh Data"
            >
              🔄
            </button>
          </div>
        )}

        {/* Emergency Alert Banner */}
        {activeSpills.some(spill => spill.volume > 10000) && (
          <div className="emergency-banner">
            <div className="banner-content">
              <span className="emergency-icon">⚠️</span>
              <strong>MAJOR SPILL ALERT:</strong> 
              Large volume chemical spill detected. Emergency protocols activated.
              <button className="banner-close" onClick={() => {}}>×</button>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;