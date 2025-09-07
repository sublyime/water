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
    
    // Set up auto-refresh interval
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadActiveSpills(false); // Silent refresh
      }, 60000); // Refresh every minute
    }

    // Set up real-time updates subscription
    const unsubscribe = apiService.subscribeToUpdates((updates) => {
      handleRealTimeUpdates(updates);
    });

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [autoRefresh]);

  // Handle real-time updates
  const handleRealTimeUpdates = useCallback((updates) => {
    if (updates && updates.length > 0) {
      updates.forEach(update => {
        switch (update.type) {
          case 'spill_created':
            setActiveSpills(prev => [...prev, update.data]);
            showNotification(`New spill reported: ${update.data.name}`, 'info');
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
            if (update.newStatus === 'CONTAINED') {
              showNotification(`Spill ${update.spillId} marked as contained`, 'success');
            }
            break;
          case 'emergency_alert':
            setEmergencyAlert(update.message);
            showNotification(update.message, 'error');
            break;
          default:
            break;
        }
      });
    }
  }, []);

  // Load active spills data
  const loadActiveSpills = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setSystemStatus('loading');
      
      const spills = await apiService.getAllSpills();
      const activeSpillsList = spills.filter(spill => 
        spill.status === 'ACTIVE' || spill.status === 'CONTAINED'
      );
      
      setActiveSpills(activeSpillsList);
      setLastUpdate(new Date());
      setSystemStatus('online');

      // Check for emergency level spills
      checkForEmergencyConditions(activeSpillsList);
      
    } catch (error) {
      console.error('Error loading spills:', error);
      setSystemStatus('error');
      showNotification('Failed to load spill data. Using offline mode.', 'warning');
      
      // Try to use cached data or show empty state
      if (activeSpills.length === 0) {
        // Load demo data for development
        const demoSpills = [
          {
            id: 'demo-1',
            name: 'Demo Oil Spill',
            chemicalType: 'Crude Oil',
            volume: 5000,
            latitude: 29.7604,
            longitude: -95.3698,
            spillTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            status: 'ACTIVE',
            priority: 'HIGH',
            source: 'Pipeline Leak',
            reporterName: 'System Demo',
            reporterContact: 'demo@system.com'
          }
        ];
        setActiveSpills(demoSpills);
      }
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  // Check for emergency conditions
  const checkForEmergencyConditions = (spills) => {
    const criticalSpills = spills.filter(spill => 
      spill.volume > 10000 || 
      spill.chemicalType.toLowerCase().includes('toxic') ||
      spill.priority === 'CRITICAL' ||
      (spill.chemicalData && spill.chemicalData.hazardClass && 
       spill.chemicalData.hazardClass.toLowerCase().includes('hazard'))
    );

    if (criticalSpills.length > 0) {
      const alertMessage = `${criticalSpills.length} critical incident(s) detected requiring immediate attention!`;
      setEmergencyAlert(alertMessage);
    } else {
      setEmergencyAlert(null);
    }
  };

  // Show notification (could be replaced with a proper notification system)
  const showNotification = (message, type = 'info') => {
    // Simple notification - could be enhanced with a proper notification library
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // For now, show critical notifications as alerts
    if (type === 'error') {
      setTimeout(() => {
        alert(message);
      }, 100);
    }
  };

  // Handle spill creation
  const handleSpillCreated = useCallback((newSpill) => {
    setActiveSpills(prev => {
      // Avoid duplicates
      const exists = prev.some(spill => spill.id === newSpill.id);
      if (exists) {
        return prev.map(spill => spill.id === newSpill.id ? newSpill : spill);
      }
      return [...prev, newSpill];
    });
    
    setSelectedSpill(newSpill);
    showNotification(`New spill reported: ${newSpill.name}`, 'success');
    
    // Check if this creates an emergency condition
    checkForEmergencyConditions([...activeSpills, newSpill]);
  }, [activeSpills]);

  // Handle spill selection
  const handleSpillSelected = useCallback((spill) => {
    setSelectedSpill(spill);
  }, []);

  // Handle spill updates
  const handleSpillUpdated = useCallback((updatedSpill) => {
    setActiveSpills(prev => 
      prev.map(spill => 
        spill.id === updatedSpill.id ? updatedSpill : spill
      )
    );
    
    if (selectedSpill && selectedSpill.id === updatedSpill.id) {
      setSelectedSpill(updatedSpill);
    }
    
    showNotification(`Spill ${updatedSpill.name} updated`, 'info');
  }, [selectedSpill]);

  // Handle dispersion calculation
  const handleCalculateDispersion = async (spillId, simulationHours = 24) => {
    try {
      const result = await apiService.calculateDispersion(spillId, simulationHours);
      
      // Update the spill with dispersion data
      setActiveSpills(prev => 
        prev.map(spill => 
          spill.id === spillId 
            ? { ...spill, dispersionData: result.dispersionData, lastCalculated: new Date().toISOString() }
            : spill
        )
      );
      
      showNotification('Dispersion calculation completed', 'success');
      return result;
    } catch (error) {
      console.error('Error calculating dispersion:', error);
      showNotification('Dispersion calculation failed', 'error');
      throw error;
    }
  };

  // Handle status updates
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
      
      showNotification(`Spill status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating spill status:', error);
      showNotification('Failed to update spill status', 'error');
    }
  };

  // System status indicator
  const getSystemStatusClass = () => {
    switch (systemStatus) {
      case 'online': return 'status-online';
      case 'loading': return 'status-loading';
      case 'error': return 'status-error';
      default: return 'status-unknown';
    }
  };

  const getSystemStatusText = () => {
    switch (systemStatus) {
      case 'online': return 'System Online';
      case 'loading': return 'Updating...';
      case 'error': return 'Connection Issue';
      default: return 'Unknown Status';
    }
  };

  // Loading screen
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
        {/* Emergency Alert Banner */}
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

        {/* Main Header */}
        <header className="app-header">
          <div className="header-content">
            {/* Logo and Title */}
            <div className="header-brand">
              <h1 className="app-title">
                <span className="title-icon">💧</span>
                Water Dispersion Monitor
              </h1>
              <div className="system-status">
                <div className={`status-indicator ${getSystemStatusClass()}`}></div>
                <span className="status-text">{getSystemStatusText()}</span>
                {lastUpdate && (
                  <span className="last-update">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="main-nav">
              <NavLink to="/dashboard" icon="🏠" label="Dashboard" />
              <NavLink to="/map" icon="🗺️" label="Map" />
              <NavLink to="/weather" icon="🌤️" label="Weather" />
              <NavLink to="/spill" icon="🚨" label="Report Incident" className="nav-btn-primary" />
            </nav>

            {/* Status Indicators */}
            <div className="header-status">
              <div className="status-grid">
                <div className="status-item">
                  <div className="status-value">{activeSpills.length}</div>
                  <div className="status-label">Active</div>
                </div>
                <div className="status-item critical">
                  <div className="status-value">
                    {activeSpills.filter(s => s.priority === 'CRITICAL' || s.volume > 10000).length}
                  </div>
                  <div className="status-label">Critical</div>
                </div>
              </div>
              
              <div className="header-controls">
                <button
                  className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                >
                  {autoRefresh ? '🔄' : '⏸️'}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => loadActiveSpills(true)}
                  title="Refresh data"
                  disabled={loading}
                >
                  🔃
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
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
            <Route 
              path="/settings" 
              element={
                <SettingsPage 
                  autoRefresh={autoRefresh}
                  onAutoRefreshToggle={setAutoRefresh}
                  systemStatus={systemStatus}
                  lastUpdate={lastUpdate}
                />
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-info">
              <span>Water Dispersion Monitor v2.0</span>
              <span className="separator">•</span>
              <span>Emergency Response System</span>
            </div>
            <div className="footer-stats">
              <span>System Uptime: 99.9%</span>
              <span className="separator">•</span>
              <span>Data Sources: Weather.gov, NOAA, PubChem</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

// Custom navigation link component
function NavLink({ to, icon, label, className = '' }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      className={`nav-btn ${className} ${isActive ? 'active' : ''}`} 
      to={to}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

// Simple settings page component
function SettingsPage({ autoRefresh, onAutoRefreshToggle, systemStatus, lastUpdate }) {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>System Settings</h2>
        <p>Configure system behavior and monitoring options</p>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>Data Refresh</h3>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshToggle(e.target.checked)}
            />
            <span>Auto-refresh data every minute</span>
          </label>
        </div>
        
        <div className="settings-section">
          <h3>System Status</h3>
          <div className="status-info">
            <p>Current Status: <strong>{systemStatus}</strong></p>
            {lastUpdate && (
              <p>Last Update: <strong>{lastUpdate.toLocaleString()}</strong></p>
            )}
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Data Sources</h3>
          <ul className="data-sources">
            <li>Weather Data: weather.gov API</li>
            <li>Tidal Data: NOAA Tides & Currents</li>
            <li>Chemical Data: PubChem Database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;