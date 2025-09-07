import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

function Dashboard({ spills, onSpillSelect, onCreate }) {
  const [stats, setStats] = useState({
    totalSpills: 0,
    activeSpills: 0,
    totalVolume: 0,
    criticalSpills: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    calculateStats();
  }, [spills]);

  const calculateStats = () => {
    const activeSpills = spills.filter(spill => spill.status === 'ACTIVE');
    const criticalSpills = spills.filter(spill => 
      spill.volume > 10000 || spill.chemicalType.toLowerCase().includes('toxic')
    );
    const totalVolume = spills.reduce((sum, spill) => sum + spill.volume, 0);

    setStats({
      totalSpills: spills.length,
      activeSpills: activeSpills.length,
      totalVolume,
      criticalSpills: criticalSpills.length
    });

    // Create recent activity log
    const activity = spills
      .sort((a, b) => new Date(b.spillTime) - new Date(a.spillTime))
      .slice(0, 5)
      .map(spill => ({
        id: spill.id,
        message: `${spill.name} reported - ${spill.chemicalType} (${spill.volume}L)`,
        time: spill.spillTime,
        type: spill.status
      }));
    
    setRecentActivity(activity);
  };

  const handleCreateSampleSpill = async () => {
    try {
      const sampleSpill = {
        name: `Incident-${Date.now()}`,
        chemicalType: 'Crude Oil',
        volume: Math.floor(Math.random() * 5000) + 1000,
        latitude: 29.7604 + (Math.random() - 0.5) * 0.1,
        longitude: -95.3698 + (Math.random() - 0.5) * 0.1,
        spillTime: new Date().toISOString(),
        waterDepth: Math.floor(Math.random() * 50) + 10
      };
      
      const created = await apiService.createSpill(sampleSpill);
      onCreate(created);
    } catch (error) {
      console.error('Error creating sample spill:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#dc2626';
      case 'CONTAINED': return '#d97706';
      case 'CLEANED': return '#059669';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#1e293b' }}>
          Emergency Response Dashboard
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Real-time monitoring of chemical spills and dispersion modeling
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-content">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2', fontSize: '2rem' }}>
              {stats.totalSpills}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Incidents</p>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626', fontSize: '2rem' }}>
              {stats.activeSpills}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Active Spills</p>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#d97706', fontSize: '2rem' }}>
              {stats.totalVolume.toLocaleString()}L
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Volume</p>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#7c3aed', fontSize: '2rem' }}>
              {stats.criticalSpills}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Critical Level</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
        {/* Active Spills */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Active Incidents</h2>
          </div>
          <div className="card-content">
            {spills.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {spills.map(spill => (
                  <div 
                    key={spill.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => onSpillSelect(spill)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.borderColor = '#1976d2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>{spill.name}</h4>
                      <span 
                        style={{
                          backgroundColor: getStatusColor(spill.status),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                      >
                        {spill.status}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                      <strong>Chemical:</strong> {spill.chemicalType}
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                      <strong>Volume:</strong> {spill.volume.toLocaleString()} L
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                      <strong>Location:</strong> {parseFloat(spill.latitude).toFixed(4)}, {parseFloat(spill.longitude).toFixed(4)}
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
                      <strong>Time:</strong> {new Date(spill.spillTime).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <p style={{ margin: '0 0 1rem 0' }}>No active incidents</p>
                <button className="btn btn-primary" onClick={handleCreateSampleSpill}>
                  Create Sample Incident
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <div className="card-content">
            {recentActivity.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id}
                    style={{
                      padding: '1rem',
                      borderLeft: `4px solid ${getStatusColor(activity.type)}`,
                      backgroundColor: '#f8fafc',
                      marginBottom: '0.5rem',
                      borderRadius: '0 8px 8px 0'
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#1e293b' }}>
                      {activity.message}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(activity.time).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleCreateSampleSpill}>
                🚨 Report New Incident
              </button>
              <button className="btn btn-secondary">
                📊 Generate Report
              </button>
              <button className="btn btn-secondary">
                🗺️ View All on Map
              </button>
              <button className="btn btn-secondary">
                ⚙️ System Settings
              </button>
              <button className="btn btn-success">
                ✅ Mark as Contained
              </button>
              <button className="btn btn-danger">
                🚨 Emergency Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;