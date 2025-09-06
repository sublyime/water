-- Chemical Dispersion Database Schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Spill incidents table
CREATE TABLE spills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    chemical_type VARCHAR(100) NOT NULL,
    volume DECIMAL(12, 2) NOT NULL, -- in liters
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    spill_time TIMESTAMP WITH TIME ZONE NOT NULL,
    water_depth DECIMAL(8, 2), -- in meters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONTAINED', 'CLEANED', 'ARCHIVED'))
);

-- Weather data table
CREATE TABLE weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature DECIMAL(5, 2), -- Celsius
    humidity DECIMAL(5, 2), -- Percentage
    pressure DECIMAL(8, 2), -- Pascals
    wind_speed DECIMAL(6, 2), -- m/s
    wind_direction DECIMAL(5, 2), -- degrees
    wind_gust DECIMAL(6, 2), -- m/s
    visibility DECIMAL(8, 2), -- meters
    cloud_cover DECIMAL(5, 2), -- percentage
    precipitation DECIMAL(6, 2), -- mm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(latitude, longitude, timestamp)
);

-- Tide and current data table
CREATE TABLE tide_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(20) NOT NULL,
    station_name VARCHAR(255),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    water_level DECIMAL(8, 3), -- meters
    current_speed DECIMAL(6, 3), -- m/s
    current_direction DECIMAL(5, 2), -- degrees
    tide_type VARCHAR(20), -- HIGH, LOW, RISING, FALLING
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, timestamp)
);

-- Dispersion calculation results table
CREATE TABLE dispersion_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spill_id UUID NOT NULL REFERENCES spills(id) ON DELETE CASCADE,
    calculation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    simulation_time_hours INTEGER NOT NULL,
    center_latitude DECIMAL(10, 7) NOT NULL,
    center_longitude DECIMAL(10, 7) NOT NULL,
    dispersion_area GEOMETRY(POLYGON, 4326),
    concentration_data JSONB, -- Concentration grid data
    plume_geometry GEOMETRY(MULTIPOLYGON, 4326),
    max_concentration DECIMAL(12, 6),
    affected_area_km2 DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chemical properties table
CREATE TABLE chemical_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    density DECIMAL(8, 4), -- kg/m³
    viscosity DECIMAL(12, 8), -- Pa·s
    solubility DECIMAL(12, 6), -- mg/L
    vapor_pressure DECIMAL(12, 6), -- Pa
    diffusion_coefficient DECIMAL(12, 8), -- m²/s
    decay_rate DECIMAL(12, 8), -- 1/s
    toxicity_level VARCHAR(20) CHECK (toxicity_level IN ('LOW', 'MEDIUM', 'HIGH', 'EXTREME')),
    environmental_fate TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring stations table
CREATE TABLE monitoring_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    station_type VARCHAR(50) NOT NULL, -- WEATHER, TIDE, CURRENT, COMBINED
    operator VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_spills_location ON spills USING GIST(location);
CREATE INDEX idx_spills_spill_time ON spills(spill_time);
CREATE INDEX idx_spills_status ON spills(status);

CREATE INDEX idx_weather_location_time ON weather_data(latitude, longitude, timestamp);
CREATE INDEX idx_weather_timestamp ON weather_data(timestamp);

CREATE INDEX idx_tide_station_time ON tide_data(station_id, timestamp);
CREATE INDEX idx_tide_location ON tide_data(latitude, longitude);

CREATE INDEX idx_dispersion_spill_id ON dispersion_results(spill_id);
CREATE INDEX idx_dispersion_calculation_time ON dispersion_results(calculation_time);
CREATE INDEX idx_dispersion_area ON dispersion_results USING GIST(dispersion_area);

CREATE INDEX idx_stations_location ON monitoring_stations USING GIST(location);
CREATE INDEX idx_stations_type ON monitoring_stations(station_type);

-- Insert some default chemical properties
INSERT INTO chemical_properties (name, density, viscosity, solubility, vapor_pressure, diffusion_coefficient, decay_rate, toxicity_level, environmental_fate) VALUES
('Crude Oil', 870.0, 0.001, 0.005, 1.0, 0.0000001, 0.0000001, 'HIGH', 'Forms slicks on surface, biodegrades slowly'),
('Diesel Fuel', 832.0, 0.0024, 0.1, 200.0, 0.0000002, 0.0000002, 'MEDIUM', 'Partially soluble, evaporates quickly'),
('Gasoline', 719.0, 0.0006, 120.0, 31000.0, 0.0000003, 0.0000005, 'HIGH', 'Highly volatile, toxic to aquatic life'),
('Benzene', 876.5, 0.00065, 1780.0, 12700.0, 0.0000009, 0.0000003, 'EXTREME', 'Highly toxic carcinogen, volatile'),
('Toluene', 866.9, 0.00056, 515.0, 3800.0, 0.0000008, 0.0000004, 'HIGH', 'Moderately toxic, biodegradable');

-- Insert some monitoring stations (examples for major US ports)
INSERT INTO monitoring_stations (station_code, name, latitude, longitude, station_type, operator) VALUES
('8518750', 'The Battery, NY', 40.7000, -74.0142, 'TIDE', 'NOAA'),
('9414290', 'San Francisco, CA', 37.8063, -122.4659, 'TIDE', 'NOAA'),
('8443970', 'Boston, MA', 42.3548, -71.0502, 'TIDE', 'NOAA'),
('8771450', 'Galveston Pier 21, TX', 29.3100, -94.7933, 'TIDE', 'NOAA'),
('9447130', 'Seattle, WA', 47.6034, -122.3389, 'TIDE', 'NOAA');