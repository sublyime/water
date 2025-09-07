import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
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
  const [systemStatus, setSystemStatus] = useState('online');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load initial data and set up auto-refresh
  useEffect(() => {
    loadActiveSpills();
    
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadActiveSpills(false);
      }, 60000);
    }
    
    const unsubscribe = apiService.subscribeToUpdates((updates) => {
      handleRealTimeUpdates(updates);
    });

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [autoRefresh]);

  const handleRealTimeUpdates = useCallback((updates) => {
    if (updates && updates.length > 0) {
      updates.forEach(update => {
        switch (update.type) {
          case 'spill_created':
            setActiveSpills(prev => [...prev, update.data]);
            break;
          case 'spill_updated':
            setActiveSpills(prev => 
              prev.map(spill => 
                spill.id === update.data.id ? { ...spill, ...update.data } : spill
              )
            );
            break;
          case 'spill_status_changed':
            setActiveSpills(prev => 
              prev.map(spill => 
                spill.id === update.spillId 
                  ? { ...spill, status: update.newStatus, updatedAt: new Date().toISOString() }
                  : spill
              )
            );
            break;
          case 'emergency_alert':
            setEmergencyAlert(update.message);
            break;
          default:
            break;
        }
      });
    }
  }, []);

  const loadActiveSpills = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true);
      setSystemStatus('loading');
      
      const spills = await apiService.getAllSpills();
      const activeSpillsList = spills.filter(spill => 
        spill.status === 'ACTIVE' || spill.status === 'CONTAINED'
      );
      
      setActiveSpills(activeSpillsList);
      setLastUpdate(new Date());
      setSystemStatus('online');

      checkForEmergencyConditions(activeSpillsList);
      
    } catch (error) {
      console.error('Error loading spills:', error);
      setSystemStatus('error');
      const demoSpills = [
        {
          id: 'demo-1',
          name: 'Demo Oil Spill',
          chemicalType: 'Crude Oil',
          volume: 5000,
          latitude: 29.7604,
          longitude: -95.3698,
          spillTime: new Date(Date.now() - 3600000).toISOString(),
          status: 'ACTIVE',
          priority: 'HIGH',
          source: 'Pipeline Leak',
          reporterName: 'System Demo',
          reporterContact: 'demo@system.com'
        }
      ];
      setActiveSpills(demoSpills);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const checkForEmergencyConditions = (spills) => {
    const criticalSpills = spills.filter(spill => 
      spill.volume > 10000 || 
      spill.chemicalType.toLowerCase().includes('toxic') ||
      spill.priority === 'CRITICAL' ||
      (spill.chemicalData && spill.chemicalData.hazardClass && 
       spill.chemicalData.hazardClass.toLowerCase().includes('hazard'))
    );

    if (criticalSpills.length > 0) {
      setEmergencyAlert(`${criticalSpills.length} critical incident(s) detected requiring immediate attention!`);
    } else {
      setEmergencyAlert(null);
    }
  };

  const handleSpillCreated = useCallback((newSpill) => {
    setActiveSpills(prev => {
      const exists = prev.some(spill => spill.id === newSpill.id);
      if (exists) return prev.map(spill => spill.id === newSpill.id ? newSpill : spill);
      return [...prev, newSpill];
    });
    setSelectedSpill(newSpill);
    checkForEmergencyConditions([...activeSpills, newSpill]);
  }, [activeSpills]);

  const handleSpillSelected = useCallback((spill) => {
    setSelectedSpill(spill);
  }, []);

  const handleSpillUpdated = useCallback((updatedSpill) => {
    setActiveSpills(prev => 
      prev.map(spill => 
        spill.id === updatedSpill.id ? updatedSpill : spill
      )
    );
    if (selectedSpill && selectedSpill.id === updatedSpill.id) {
      setSelectedSpill(updatedSpill);
    }
  }, [selectedSpill]);

  const handleCalculateDispersion = async (spillId, simulationHours = 24) => {
    try {
      const result = await apiService.calculateDispersion(spillId, simulationHours);
      setActiveSpills(prev => 
        prev.map(spill => 
          spill.id === spillId 
            ? { ...spill, dispersionData: result.dispersionData, lastCalculated: new Date().toISOString() }
            : spill
        )
      );
      return result;
    } catch (error) {
      console.error('Error calculating dispersion:', error);
      throw error;
    }
  };

  const handleStatusUpdate = async (spillId, newStatus) => {
    try {
      await apiService.updateSpillStatus(spillId, newStatus);
      setActiveSpills(prev => 
        prev.map(spill => 
          spill.id === spillId 
            ? { ...spill, status: newStatus, updatedAt: new Date().toISOString() }
            : spill
        )
      );
    } catch (error) {
      console.error('Error updating spill status:', error);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Initializing Chemical Dispersion System</h2>
          <p>Loading monitoring systems and data sources...</p>
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
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
              <span className="emergency-text">{emergencyAlert}</span>
              <div className="banner-actions">
                <button 
                  className="btn btn-sm btn-light"
                  onClick={() => setSelectedSpill(activeSpills.find(s => s.priority === 'CRITICAL' || s.volume > 10000))}
                >
                  View Details
                </button>
                <button 
                  className="banner-close" 
                  onClick={() => setEmergencyAlert(null)}
                  aria-label="Close emergency alert"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        <FloatingPanel />

        <main className="app-main">
          <Routes>
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  spills={activeSpills} 
                  onSpillSelect={handleSpillSelected}
                  onSpillUpdate={handleSpillUpdated}
                  onStatusUpdate={handleStatusUpdate}
                  onCreate={handleSpillCreated}
                  systemStatus={systemStatus}
                />
              } 
            />
            <Route 
              path="/spill" 
              element={
                <SpillForm 
                  onSpillCreated={handleSpillCreated}
                  existingSpills={activeSpills}
                />
              } 
            />
            <Route 
              path="/weather" 
              element={
                <WeatherPanel 
                  selectedLocation={selectedSpill ? {
                    lat: selectedSpill.latitude, 
                    lng: selectedSpill.longitude
                  } : null}
                  autoRefresh={autoRefresh}
                />
              } 
            />
            <Route 
              path="/map" 
              element={
                <DispersionMap 
                  spills={activeSpills}
                  selectedSpill={selectedSpill}
                  onSpillSelect={handleSpillSelected}
                  onSpillUpdate={handleSpillUpdated}
                  onStatusUpdate={handleStatusUpdate}
                  calculateDispersion={handleCalculateDispersion}
                  autoRefresh={autoRefresh}
                />
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Custom Floating Panel Component
function FloatingPanel() {
  return (
    <aside className="floating-panel">
      <div className="icon-bar">
        <FloatingNavLink to="/dashboard" icon="📊" label="Dashboard" />
        <FloatingNavLink to="/map" icon="🗺️" label="Map" />
        <FloatingNavLink to="/weather" icon="🌤️" label="Weather" />
        <FloatingNavLink to="/spill" icon="🚨" label="Report Incident" className="primary" />
      </div>
    </aside>
  );
}

function FloatingNavLink({ to, icon, label, className = '' }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      className={`nav-item ${className} ${isActive ? 'active' : ''}`} 
      to={to}
      title={label}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export default App;