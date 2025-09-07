import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import SpillForm from './components/Forms/SpillForm';
import WeatherPanel from './components/Weather/WeatherPanel';
import DispersionMap from './components/Map/DispersionMap';
import { apiService } from './services/api';
import './App.css';

function App() {
    const [activeSpills, setActiveSpills] = useState([]);
    const [allSpills, setAllSpills] = useState([]);
    const [selectedSpill, setSelectedSpill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [emergencyAlert, setEmergencyAlert] = useState(null);
    const [systemStatus, setSystemStatus] = useState('online');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // FIXED: Track calculations in progress to prevent infinite loops
    const calculationsInProgress = useRef(new Set());
    const calculationTimeouts = useRef(new Map());

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
            // Clear any pending calculation timeouts
            calculationTimeouts.current.forEach(timeout => clearTimeout(timeout));
            calculationTimeouts.current.clear();
        };
    }, [autoRefresh]);

    // Handle real-time updates
    const handleRealTimeUpdates = useCallback((updates) => {
        if (updates && updates.length > 0) {
            updates.forEach(update => {
                switch (update.type) {
                    case 'spill_created':
                        setActiveSpills(prev => [...prev, update.data]);
                        setAllSpills(prev => [...prev, update.data]);
                        showNotification(`New spill reported: ${update.data.name}`, 'info');
                        break;
                    case 'spill_updated':
                        setActiveSpills(prev => 
                            prev.map(spill => 
                                spill.id === update.data.id ? { ...spill, ...update.data } : spill
                            )
                        );
                        setAllSpills(prev => 
                            prev.map(spill => 
                                spill.id === update.data.id ? { ...spill, ...update.data } : spill
                            )
                        );
                        break;
                    case 'spill_status_changed':
                        setActiveSpills(prev => 
                            prev.map(spill => 
                                spill.id === update.spillId ? 
                                { ...spill, status: update.newStatus, updatedAt: new Date().toISOString() } : spill
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

            const [allSpillsData, activeSpillsData] = await Promise.all([
                apiService.getAllSpills(),
                apiService.getActiveSpills()
            ]);

            // Ensure arrays
            const allSpillsArray = Array.isArray(allSpillsData) ? allSpillsData : [];
            const activeSpillsArray = Array.isArray(activeSpillsData) ? activeSpillsData : [];
            
            // Filter active spills from all spills if needed
            const activeSpillsList = activeSpillsArray.length > 0 ? 
                activeSpillsArray : 
                allSpillsArray.filter(spill => 
                    spill.status === 'ACTIVE' || spill.status === 'CONTAINED'
                );

            setAllSpills(allSpillsArray);
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
            if (activeSpills.length === 0 && allSpills.length === 0) {
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
                setAllSpills(demoSpills);
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

        setAllSpills(prev => {
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
            prev.map(spill => spill.id === updatedSpill.id ? updatedSpill : spill)
        );
        setAllSpills(prev => 
            prev.map(spill => spill.id === updatedSpill.id ? updatedSpill : spill)
        );

        if (selectedSpill && selectedSpill.id === updatedSpill.id) {
            setSelectedSpill(updatedSpill);
        }
        showNotification(`Spill ${updatedSpill.name} updated`, 'info');
    }, [selectedSpill]);

    // FIXED: Handle dispersion calculation with proper debouncing and deduplication
    const handleCalculateDispersion = useCallback(async (spillId, simulationHours = 24) => {
        // Prevent multiple calculations for the same spill
        if (calculationsInProgress.current.has(spillId)) {
            console.log(`[SKIP] Calculation already in progress for spill ${spillId}`);
            return;
        }

        // Clear any existing timeout for this spill
        if (calculationTimeouts.current.has(spillId)) {
            clearTimeout(calculationTimeouts.current.get(spillId));
            calculationTimeouts.current.delete(spillId);
        }

        // Add to in-progress set
        calculationsInProgress.current.add(spillId);

        try {
            console.log(`[STARTING] Dispersion calculation for spill ${spillId}`);
            
            const result = await apiService.calculateDispersion(spillId, simulationHours);
            
            // Update the spill with dispersion data
            setActiveSpills(prev => 
                prev.map(spill => 
                    spill.id === spillId ? 
                    { 
                        ...spill, 
                        dispersionData: result.dispersionData,
                        lastCalculated: new Date().toISOString() 
                    } : spill
                )
            );

            setAllSpills(prev => 
                prev.map(spill => 
                    spill.id === spillId ? 
                    { 
                        ...spill, 
                        dispersionData: result.dispersionData,
                        lastCalculated: new Date().toISOString() 
                    } : spill
                )
            );
            
            console.log(`[SUCCESS] Dispersion calculation completed for ${spillId}`);
            showNotification('Dispersion calculation completed', 'success');
            return result;
        } catch (error) {
            console.error(`[ERROR] Dispersion calculation failed for ${spillId}:`, error);
            showNotification('Dispersion calculation failed', 'error');
            throw error;
        } finally {
            // Remove from in-progress set
            calculationsInProgress.current.delete(spillId);
        }
    }, []);

    // Handle status updates
    const handleStatusUpdate = async (spillId, newStatus) => {
        try {
            await apiService.updateSpillStatus(spillId, newStatus);
            
            setActiveSpills(prev => 
                prev.map(spill => 
                    spill.id === spillId ? 
                    { ...spill, status: newStatus, updatedAt: new Date().toISOString() } : spill
                )
            );

            setAllSpills(prev => 
                prev.map(spill => 
                    spill.id === spillId ? 
                    { ...spill, status: newStatus, updatedAt: new Date().toISOString() } : spill
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
                    <h2>Loading Chemical Dispersion Monitor</h2>
                    <p>Initializing monitoring systems and data sources...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            {/* Emergency Alert Banner */}
            {emergencyAlert && (
                <div className="emergency-alert">
                    <div className="alert-content">
                        <span className="alert-icon">⚠️</span>
                        <span className="alert-message">{emergencyAlert}</span>
                        <button 
                            className="alert-close" 
                            onClick={() => setEmergencyAlert(null)}
                            aria-label="Close alert"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* System Status Bar */}
            <div className="system-status-bar">
                <div className="status-info">
                    <span className={`status-indicator ${getSystemStatusClass()}`}></span>
                    <span className="status-text">{getSystemStatusText()}</span>
                    {lastUpdate && (
                        <span className="last-update">
                            Last Update: {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <div className="system-controls">
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto Refresh
                    </label>
                    <button 
                        className="refresh-button"
                        onClick={() => loadActiveSpills(true)}
                        disabled={systemStatus === 'loading'}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <Router>
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            <Dashboard 
                                spills={allSpills}
                                activeSpills={activeSpills}
                                onSpillSelect={handleSpillSelected}
                                onCreate={handleSpillCreated}
                                onStatusUpdate={handleStatusUpdate}
                                systemStatus={systemStatus}
                            />
                        } 
                    />
                    <Route 
                        path="/spill" 
                        element={
                            <SpillForm 
                                onSpillCreated={handleSpillCreated}
                            />
                        } 
                    />
                    <Route 
                        path="/map" 
                        element={
                            <DispersionMap 
                                spills={allSpills}
                                activeSpills={activeSpills}
                                selectedSpill={selectedSpill}
                                onSpillSelect={handleSpillSelected}
                                calculateDispersion={handleCalculateDispersion}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        } 
                    />
                    <Route 
                        path="/weather" 
                        element={<WeatherPanel />} 
                    />
                    <Route 
                        path="*" 
                        element={<Navigate to="/" replace />} 
                    />
                </Routes>
            </Router>
        </div>
    );
}

export default App;
