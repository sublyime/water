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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

        {/* Vertical Sidebar Navigation */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
          {/* Sidebar Toggle */}
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <span className="toggle-icon">
              {sidebarCollapsed ? '▶' : '◀'}
            </span>
          </button>

          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="app-brand">
              <div className="brand-icon">💧</div>
              {!sidebarCollapsed && (
                <div className="brand-text">
                  <h1 className="app-title">Water Dispersion Monitor</h1>
                  <p className="app-subtitle">Emergency Response System</p>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon">⚡</span>
              {!sidebarCollapsed && <span className="section-title">System Status</span>}
            </div>
            {!sidebarCollapsed && (
              <div className="status-details">
                <div className={`status-indicator ${getSystemStatusClass()}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">{getSystemStatusText()}</span>
                </div>
                {lastUpdate && (
                  <div className="last-update">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="section-header">
                <span className="section-icon">🧭</span>
                {!sidebarCollapsed && <span className="section-title">Navigation</span>}
              </div>
              <div className="nav-items">
                <SidebarNavLink 
                  to="/dashboard" 
                  icon="📊" 
                  label="Dashboard" 
                  collapsed={sidebarCollapsed}
                />
                <SidebarNavLink 
                  to="/map" 
                  icon="🗺️" 
                  label="Map" 
                  collapsed={sidebarCollapsed}
                />
                <SidebarNavLink 
                  to="/weather" 
                  icon="🌤️" 
                  label="Weather" 
                  collapsed={sidebarCollapsed}
                />
                <SidebarNavLink 
                  to="/spill" 
                  icon="🚨" 
                  label="Report Incident" 
                  collapsed={sidebarCollapsed}
                  className="primary"
                />
              </div>
            </div>
          </nav>

          {/* Active Incidents */}
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon">📋</span>
              {!sidebarCollapsed && <span className="section-title">Active Incidents</span>}
            </div>
            {!sidebarCollapsed && (
              <div className="incidents-summary">
                <div className="incident-stat">
                  <div className="stat-number">{activeSpills.length}</div>
                  <div className="stat-label">Total Active</div>
                </div>
                <div className="incident-stat critical">
                  <div className="stat-number">
                    {activeSpills.filter(s => s.priority === 'CRITICAL' || s.volume > 10000).length}
                  </div>
                  <div className="stat-label">Critical</div>
                </div>
              </div>
            )}
          </div>

          {/* System Controls */}
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon">🔧</span>
              {!sidebarCollapsed && <span className="section-title">Controls</span>}
            </div>
            {!sidebarCollapsed && (
              <div className="controls-panel">
                <button
                  className={`control-btn ${autoRefresh ? 'active' : ''}`}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                >
                  <span className="control-icon">{autoRefresh ? '🔄' : '⏸️'}</span>
                  <span className="control-label">Auto Refresh</span>
                </button>
                <button
                  className="control-btn"
                  onClick={() => loadActiveSpills(true)}
                  title="Refresh data"
                  disabled={loading}
                >
                  <span className="control-icon">🔃</span>
                  <span className="control-label">Refresh Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            {!sidebarCollapsed && (
              <div className="footer-content">
                <div className="version-info">v2.0</div>
                <div className="uptime-info">99.9% uptime</div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
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
      </div>
    </Router>
  );
}

// Custom sidebar navigation link component
function SidebarNavLink({ to, icon, label, collapsed, className = '' }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      className={`nav-item ${className} ${isActive ? 'active' : ''}`} 
      to={to}
      title={collapsed ? label : ''}
    >
      <span className="nav-icon">{icon}</span>
      {!collapsed && <span className="nav-label">{label}</span>}
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