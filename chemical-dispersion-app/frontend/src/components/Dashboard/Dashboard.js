import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import './Dashboard.css';

function Dashboard({ spills = [], onSpillSelect, onCreate, systemStatus = 'online' }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalSpills: 0,
        activeSpills: 0,
        totalVolume: 0,
        criticalSpills: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Calculate stats from props when spills change
    useEffect(() => {
        calculateStats(spills);
        generateRecentActivity(spills);
    }, [spills]);

    // Load additional dashboard data
    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const calculateStats = (spillsData) => {
        const safeSpills = Array.isArray(spillsData) ? spillsData : [];
        
        const totalSpills = safeSpills.length;
        const activeSpills = safeSpills.filter(s => s.status === 'ACTIVE').length;
        const totalVolume = safeSpills.reduce((sum, spill) => sum + (spill.volume || 0), 0);
        const criticalSpills = safeSpills.filter(s => 
            (s.volume || 0) > 10000 || 
            s.priority === 'CRITICAL' ||
            (s.chemicalType && s.chemicalType.toLowerCase().includes('toxic'))
        ).length;

        setStats({
            totalSpills,
            activeSpills,
            totalVolume,
            criticalSpills
        });
    };

    const generateRecentActivity = (spillsData) => {
        const safeSpills = Array.isArray(spillsData) ? spillsData : [];
        
        const activity = safeSpills
            .sort((a, b) => new Date(b.spillTime || 0) - new Date(a.spillTime || 0))
            .slice(0, 10)
            .map(spill => ({
                id: spill.id || Math.random().toString(),
                message: `${spill.name || 'Unnamed Incident'} - ${spill.chemicalType || 'Unknown Chemical'} (${(spill.volume || 0).toLocaleString()}L)`,
                time: spill.spillTime || new Date().toISOString(),
                type: spill.status || 'UNKNOWN',
                priority: spill.priority || 'MEDIUM',
                spill: spill
            }));
        
        setRecentActivity(activity);
    };

    const loadDashboardData = async () => {
        try {
            setError(null);
            
            // Try to get additional system status from API
            const statusResponse = await apiService.getSystemStatus();
            
            // Merge with calculated stats if API provides additional data
            if (statusResponse && typeof statusResponse === 'object') {
                setStats(prevStats => ({
                    ...prevStats,
                    ...statusResponse
                }));
            }
            
        } catch (error) {
            console.warn('Could not load additional dashboard data:', error.message);
            // Don't show error to user since we have fallback data from props
        }
    };

    const handleReportIncident = () => {
        navigate('/spill');
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const safeSpills = Array.isArray(spills) ? spills : [];
            
            const reportData = {
                timestamp: new Date().toISOString(),
                systemStatus: systemStatus,
                totalIncidents: safeSpills.length,
                activeIncidents: safeSpills.filter(s => s.status === 'ACTIVE').length,
                containedIncidents: safeSpills.filter(s => s.status === 'CONTAINED').length,
                cleanedIncidents: safeSpills.filter(s => s.status === 'CLEANED_UP').length,
                criticalIncidents: safeSpills.filter(s => 
                    (s.volume || 0) > 10000 || 
                    s.priority === 'CRITICAL' ||
                    (s.chemicalType && s.chemicalType.toLowerCase().includes('toxic'))
                ).length,
                totalVolume: safeSpills.reduce((sum, spill) => sum + (spill.volume || 0), 0),
                incidents: safeSpills.map(spill => ({
                    id: spill.id || 'N/A',
                    name: spill.name || 'Unnamed Incident',
                    chemical: spill.chemicalType || 'Unknown',
                    volume: spill.volume || 0,
                    location: `${parseFloat(spill.latitude || 0).toFixed(4)}, ${parseFloat(spill.longitude || 0).toFixed(4)}`,
                    status: spill.status || 'Unknown',
                    priority: spill.priority || 'Unknown',
                    reportTime: spill.spillTime || new Date().toISOString(),
                    reportedBy: spill.reporterName || spill.reportedBy || 'Unknown',
                    source: spill.source || 'Unknown'
                }))
            };

            const reportContent = generateReportContent(reportData);
            
            // Create and download the report
            const blob = new Blob([reportContent], { type: 'text/plain; charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chemical-spill-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Show success message
            alert('Report generated and downloaded successfully!');
            
        } catch (error) {
            console.error('Error generating report:', error);
            setError('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateReportContent = (data) => {
        const timestamp = new Date(data.timestamp).toLocaleString();
        
        return `
CHEMICAL SPILL INCIDENT REPORT
Generated: ${timestamp}
System Status: ${data.systemStatus.toUpperCase()}
=====================================

EXECUTIVE SUMMARY
-----------------
This report provides a comprehensive overview of all chemical spill incidents 
monitored by the Water Dispersion Monitor System as of ${timestamp}.

SUMMARY STATISTICS
------------------
Total Incidents: ${data.totalIncidents}
Active Incidents: ${data.activeIncidents}
Contained Incidents: ${data.containedIncidents}
Cleaned Up Incidents: ${data.cleanedIncidents}
Critical Level Incidents: ${data.criticalIncidents}
Total Volume Spilled: ${data.totalVolume.toLocaleString()} Liters

STATUS BREAKDOWN
----------------
- Active: ${data.activeIncidents} (${data.totalIncidents > 0 ? Math.round((data.activeIncidents / data.totalIncidents) * 100) : 0}%)
- Contained: ${data.containedIncidents} (${data.totalIncidents > 0 ? Math.round((data.containedIncidents / data.totalIncidents) * 100) : 0}%)
- Cleaned Up: ${data.cleanedIncidents} (${data.totalIncidents > 0 ? Math.round((data.cleanedIncidents / data.totalIncidents) * 100) : 0}%)

INCIDENT DETAILS
----------------
${data.incidents.length > 0 ? data.incidents.map((incident, index) => `
${index + 1}. ${incident.name}
   ID: ${incident.id}
   Chemical: ${incident.chemical}
   Volume: ${incident.volume.toLocaleString()} L
   Location: ${incident.location}
   Status: ${incident.status}
   Priority: ${incident.priority}
   Source: ${incident.source}
   Reported By: ${incident.reportedBy}
   Reported: ${new Date(incident.reportTime).toLocaleString()}
`).join('\n') : 'No incidents to report.'}

RISK ASSESSMENT
---------------
${data.criticalIncidents > 0 ? `⚠️ URGENT: ${data.criticalIncidents} critical incidents require immediate attention` : '✅ No critical incidents at this time'}
${data.activeIncidents > 5 ? `⚠️ High incident volume: ${data.activeIncidents} active incidents may strain response resources` : ''}
${data.totalVolume > 50000 ? `⚠️ Large cumulative volume: ${data.totalVolume.toLocaleString()} L total spillage indicates significant environmental impact` : ''}
${data.activeIncidents === 0 && data.criticalIncidents === 0 ? '✅ System status nominal - no active critical incidents' : ''}

RECOMMENDATIONS
---------------
${data.criticalIncidents > 0 ? '1. Prioritize critical incidents for immediate containment\n' : ''}
${data.activeIncidents > 3 ? '2. Consider activating additional response teams\n' : ''}
${data.totalVolume > 25000 ? '3. Assess environmental impact and notify relevant agencies\n' : ''}
${data.incidents.filter(i => i.chemical.toLowerCase().includes('toxic')).length > 0 ? '4. Monitor air and water quality in affected areas\n' : ''}
5. Continue regular monitoring and update dispersion models
6. Maintain readiness for emergency response

SYSTEM INFORMATION
------------------
Report Generated By: Water Dispersion Monitor System v2.0
Data Source: Real-time monitoring network
Quality Assurance: Automated data validation applied
Next Scheduled Report: ${new Date(Date.now() + 24*60*60*1000).toLocaleString()}

For questions about this report, contact the system administrator.
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
            
            // The parent component should handle updating the spills array
            if (onSpillSelect) {
                // Refresh the selected spill data
                const updatedSpill = spills.find(s => s.id === spillId);
                if (updatedSpill) {
                    onSpillSelect({...updatedSpill, status: 'CONTAINED'});
                }
            }
            
        } catch (error) {
            console.error('Error updating spill status:', error);
            setError('Failed to update spill status. Please try again.');
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
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return '#dc2626';
            case 'CONTAINED': return '#d97706';
            case 'CLEANED_UP': return '#059669';
            case 'ARCHIVED': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    };

    const formatTimeAgo = (timeString) => {
        try {
            const time = new Date(timeString);
            const now = new Date();
            const diffMs = now - time;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            return 'Recently';
        } catch {
            return 'Unknown time';
        }
    };

    return (
        <div className="dashboard-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Processing request...</p>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setError(null)}
                        style={{ marginLeft: 'auto' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Chemical Dispersion Monitor</h1>
                    <p>Real-time monitoring of chemical spills and dispersion modeling</p>
                    <div className="system-status">
                        <span className={`status-indicator ${systemStatus === 'online' ? 'online' : 'offline'}`}></span>
                        <span>System {systemStatus}</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary btn-lg" 
                        onClick={handleReportIncident}
                        disabled={loading}
                    >
                        📝 Report New Incident
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
                        <div>
                            <button 
                                className="btn btn-outline btn-sm" 
                                onClick={() => generateRecentActivity(spills)}
                                disabled={loading}
                                style={{ marginRight: '0.5rem' }}
                            >
                                🔄 Refresh
                            </button>
                            <button 
                                className="btn btn-outline btn-sm" 
                                onClick={handleViewAllOnMap}
                            >
                                View All
                            </button>
                        </div>
                    </div>
                    <div className="card-content">
                        {recentActivity.length > 0 ? (
                            <div className="activity-list">
                                {recentActivity.map((activity) => (
                                    <div 
                                        key={activity.id} 
                                        className="activity-item"
                                        onClick={() => {
                                            if (onSpillSelect) onSpillSelect(activity.spill);
                                            navigate('/map');
                                        }}
                                    >
                                        <div className="activity-content">
                                            <p className="activity-message">
                                                {getPriorityIcon(activity.priority)} {activity.message}
                                            </p>
                                            <p className="activity-time">
                                                {formatTimeAgo(activity.time)} • {activity.type}
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
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleReportIncident}
                                    style={{ marginTop: '1rem' }}
                                >
                                    Report First Incident
                                </button>
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
                                disabled={loading}
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