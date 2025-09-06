import React, { useState } from 'react';
import IncidentDetails from './IncidentDetails';
import MapLayers from './MapLayers';
import Weather from './Weather';
import Analysis from './Analysis';
import Reports from './Reports';
import './SlidingPanel.css';  // Import styles below

function SlidingPanel({ location }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('incident');  // Default section

  const sections = [
    { id: 'incident', label: 'Incident Details', icon: '📍', component: <IncidentDetails location={location} /> },
    { id: 'layers', label: 'Map Layers', icon: '🗺️', component: <MapLayers /> },
    { id: 'weather', label: 'Weather', icon: '☁️', component: <Weather /> },
    { id: 'analysis', label: 'Analysis', icon: '📊', component: <Analysis /> },
    { id: 'reports', label: 'Reports', icon: '📄', component: <Reports /> },
  ];

  return (
    <div className={`sliding-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? '▶' : '◀'}
      </div>
      {!isCollapsed && (
        <div className="panel-content">
          <div className="section-tabs">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`tab ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.icon} {section.label}
              </button>
            ))}
          </div>
          <div className="section-body">
            {sections.find((s) => s.id === activeSection)?.component}
          </div>
        </div>
      )}
      {isCollapsed && (
        <div className="collapsed-icons">
          {sections.map((section) => (
            <button
              key={section.id}
              className="icon-btn"
              onClick={() => {
                setActiveSection(section.id);
                setIsCollapsed(false);
              }}
              title={section.label}
            >
              {section.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SlidingPanel;
