import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import './Dashboard.css';

function Dashboard({ spills = [], onSpillSelect, onCreate }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalSpills: 0,
        activeSpills: 0,
        totalVolume: 0,
        criticalSpills: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            // Get system status from backend
            const statusResponse = await apiService.getSystemStatus();
            // Ensure statusResponse has default values if undefined
            const safeStats = {
                totalSpills: statusResponse?.totalSpills || 0,
                activeSpills: statusResponse?.activeSpills || 0,
                totalVolume: statusResponse?.totalVolume || 0,
                criticalSpills: statusResponse?.criticalSpills || 0
            };
            setStats(safeStats);
            
            // Get all spills for recent activity
            const spillsResponse = await apiService.getAllSpills();
            const allSpills = Array.isArray(spillsResponse) ? spillsResponse : [];
            
            // Create recent activity log
            const activity = allSpills
                .sort((a, b) => new Date(b.spillTime) - new Date(a.spillTime))
                .slice(0, 8)
                .map(spill => ({
                    id: spill.id,
                    message: `${spill.name || 'Unnamed Incident'} - ${spill.chemicalType} (${(spill.volume || 0).toLocaleString()}L)`,
                    time: spill.spillTime,
                    type: spill.status,
                    spill: spill
                }));
            
            setRecentActivity(activity);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set safe defaults on error
            setStats({
                totalSpills: 0,
                activeSpills: 0,
                totalVolume: 0,
                criticalSpills: 0
            });
            setRecentActivity([]);
        }
    };

    const handleReportIncident = () => {
        navigate('/spill');
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const spillsResponse = await apiService.getAllSpills();
            const allSpills = Array.isArray(spillsResponse) ? spillsResponse : [];
            
            const reportData = {
                timestamp: new Date().toISOString(),
                totalIncidents: allSpills.length,
                activeIncidents: allSpills.filter(s => s.status === 'ACTIVE').length,
                criticalIncidents: allSpills.filter(s => 
                    (s.volume || 0) > 10000 || 
                    (s.chemicalType || '').toLowerCase().includes('toxic') ||
                    (s.chemicalType || '').toLowerCase().includes('hazard')
                ).length,
                totalVolume: allSpills.reduce((sum, spill) => sum + (spill.volume || 0), 0),
                incidents: allSpills.map(spill => ({
                    id: spill.id,
                    name: spill.name || 'Unnamed Incident',
                    chemical: spill.chemicalType || 'Unknown',
                    volume: spill.volume || 0,
                    location: `${parseFloat(spill.latitude || 0).toFixed(4)}, ${parseFloat(spill.longitude || 0).toFixed(4)}`,
                    status: spill.status || 'Unknown',
                    reportTime: spill.spillTime || new Date().toISOString(),
                    reportedBy: spill.reportedBy || 'Unknown'
                }))
            };

            const reportContent = generateReportContent(reportData);
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chemical-spill-report-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const generateReportContent = (data) => {
        return `
CHEMICAL SPILL INCIDENT REPORT
Generated: ${new Date(data.timestamp).toLocaleString()}
=====================================

SUMMARY STATISTICS
------------------
Total Incidents: ${data.totalIncidents}
Active Incidents: ${data.activeIncidents}
Critical Level Incidents: ${data.criticalIncidents}
Total Volume Spilled: ${data.totalVolume.toLocaleString()} Liters

INCIDENT DETAILS
----------------
${data.incidents.map((incident, index) => `
${index + 1}. ${incident.name}
   Chemical: ${incident.chemical}
   Volume: ${incident.volume.toLocaleString()} L
   Location: ${incident.location}
   Status: ${incident.status}
   Reported By: ${incident.reportedBy}
   Reported: ${new Date(incident.reportTime).toLocaleString()}
`).join('\n')}

RECOMMENDATIONS
---------------
${data.criticalIncidents > 0 ? `⚠️ URGENT: ${data.criticalIncidents} critical incidents require immediate attention` : '✅ No critical incidents at this time'}
${data.activeIncidents > 5 ? `⚠️ High incident volume: ${data.activeIncidents} active incidents` : ''}
${data.totalVolume > 50000 ? `⚠️ Large total volume: ${data.totalVolume.toLocaleString()} L total spillage` : ''}

Report generated by Water Dispersion Monitor System
        `.trim();
    };

    const handleViewAllOnMap = () => {
        navigate('/map');
    };

    const handleMarkAsContained = async (spillId) => {
        if (!spillId) return;
        try {
            setLoading(true);
            await apiService.updateSpillStatus(spillId, 'CONTAINED');
            loadDashboardData(); // Refresh data
        } catch (error) {
            console.error('Error updating spill status:', error);
            alert('Failed to update spill status');
        } finally {
            setLoading(false);
        }
    };

    const handleStatClick = (statType) => {
        switch (statType) {
            case 'total':
                navigate('/map');
                break;
            case 'active':
                navigate('/map', { state: { filter: 'active' } });
                break;
            case 'volume':
                navigate('/weather');
                break;
            case 'critical':
                navigate('/map', { state: { filter: 'critical' } });
                break;
            default:
                break;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return '#dc2626';
            case 'CONTAINED': return '#d97706';
            case 'CLEANED_UP': return '#059669';
            case 'ARCHIVED': return '#6b7280';
            default: return '#6b7280';
        }
    };

    return (
        <div className="dashboard-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Processing...</p>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Chemical Dispersion Monitor</h1>
                    <p>Real-time monitoring of chemical spills and dispersion modeling</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary btn-lg" onClick={handleReportIncident}>
                        📍 Report New Incident
                    </button>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="stats-grid">
                <div 
                    className="stat-card clickable" 
                    onClick={() => handleStatClick('total')}
                >
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>{stats.totalSpills}</h3>
                        <p>Total Incidents</p>
                    </div>
                </div>

                <div 
                    className="stat-card clickable" 
                    onClick={() => handleStatClick('active')}
                >
                    <div className="stat-icon">🔴</div>
                    <div className="stat-content">
                        <h3>{stats.activeSpills}</h3>
                        <p>Active Spills</p>
                    </div>
                </div>

                <div 
                    className="stat-card clickable" 
                    onClick={() => handleStatClick('volume')}
                >
                    <div className="stat-icon">💧</div>
                    <div className="stat-content">
                        <h3>{stats.totalVolume ? stats.totalVolume.toLocaleString() : 0}L</h3>
                        <p>Total Volume</p>
                    </div>
                </div>

                <div 
                    className="stat-card clickable critical" 
                    onClick={() => handleStatClick('critical')}
                >
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{stats.criticalSpills}</h3>
                        <p>Critical Level</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="main-grid">
                {/* Recent Activity */}
                <div className="content-card">
                    <div className="card-header">
                        <h2>Recent Activity</h2>
                        <button className="btn btn-outline btn-sm" onClick={handleViewAllOnMap}>
                            View All
                        </button>
                    </div>
                    <div className="card-content">
                        {recentActivity.length > 0 ? (
                            <div className="activity-list">
                                {recentActivity.map((activity) => (
                                    <div 
                                        key={activity.id} 
                                        className="activity-item"
                                        onClick={() => navigate('/map', { state: { selectedSpill: activity.spill } })}
                                    >
                                        <div className="activity-content">
                                            <p className="activity-message">{activity.message}</p>
                                            <p className="activity-time">
                                                {new Date(activity.time).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="activity-status">
                                            <span 
                                                className="status-dot" 
                                                style={{ backgroundColor: getStatusColor(activity.type) }}
                                            ></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <p>No recent activity</p>
                                <small>Incidents will appear here as they are reported</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="content-card">
                    <div className="card-header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div className="card-content">
                        <div className="actions-grid">
                            <button 
                                className="action-btn primary"
                                onClick={handleReportIncident}
                            >
                                <div className="action-icon">🚨</div>
                                <div className="action-content">
                                    <h4>Report Incident</h4>
                                    <p>Report a new chemical spill</p>
                                </div>
                            </button>

                            <button 
                                className="action-btn secondary"
                                onClick={handleViewAllOnMap}
                            >
                                <div className="action-icon">🗺️</div>
                                <div className="action-content">
                                    <h4>View Map</h4>
                                    <p>See all incidents on map</p>
                                </div>
                            </button>

                            <button 
                                className="action-btn success"
                                onClick={handleGenerateReport}
                                disabled={loading}
                            >
                                <div className="action-icon">📄</div>
                                <div className="action-content">
                                    <h4>Generate Report</h4>
                                    <p>Create incident summary</p>
                                </div>
                            </button>

                            <button 
                                className="action-btn warning"
                                onClick={() => navigate('/weather')}
                            >
                                <div className="action-icon">🌤️</div>
                                <div className="action-content">
                                    <h4>Weather Data</h4>
                                    <p>View current conditions</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
