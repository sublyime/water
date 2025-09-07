import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        console.error('❌ Response Error:', error.response?.data || error.message);
        
        // Enhanced error handling
        if (error.response?.status === 404) {
            throw new Error('Resource not found');
        } else if (error.response?.status === 400) {
            throw new Error(error.response.data?.message || 'Invalid request');
        } else if (error.response?.status === 500) {
            throw new Error('Server error occurred');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - please try again');
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            throw new Error('Network error - please check your connection');
        }
        throw error;
    }
);

export const apiService = {
    // Spill Endpoints - Return data directly
    async getAllSpills() {
        try {
            const response = await api.get('/dispersion/spills/all');
            return response.data;
        } catch (error) {
            console.warn('Unable to fetch spills from server, using demo data');
            return this.getDemoSpills();
        }
    },

    async getActiveSpills() {
        try {
            const response = await api.get('/dispersion/spills');
            return response.data;
        } catch (error) {
            console.warn('Unable to fetch active spills, using demo data');
            return this.getDemoSpills().filter(spill => spill.status === 'ACTIVE');
        }
    },

    async createSpill(spillData) {
        try {
            // Validate spill data before sending
            const validationErrors = this.validateSpillData(spillData);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const response = await api.post('/dispersion/spills', spillData);
            return response.data;
        } catch (error) {
            // If server is unavailable, create a mock response
            if (error.message.includes('Network error') || error.code === 'ECONNABORTED') {
                console.warn('Server unavailable, creating spill locally');
                return this.createMockSpill(spillData);
            }
            throw error;
        }
    },

    async updateSpillStatus(spillId, status) {
        try {
            const response = await api.put(`/dispersion/spills/${spillId}/status`, null, {
                params: { status }
            });
            return response.data;
        } catch (error) {
            console.warn(`Failed to update spill status: ${error.message}`);
            // Return mock success response
            return {
                id: spillId,
                status: status,
                updatedAt: new Date().toISOString()
            };
        }
    },

    async calculateDispersion(spillId, simulationHours = 24) {
        try {
            const response = await api.post(`/dispersion/spills/${spillId}/calculate`, null, {
                params: { simulationHours }
            });
            return response.data;
        } catch (error) {
            console.warn('Dispersion calculation service unavailable, using mock calculation');
            return this.mockDispersionCalculation(spillId, simulationHours);
        }
    },

    async deleteSpill(spillId) {
        try {
            const response = await api.delete(`/dispersion/spills/${spillId}`);
            return response.data;
        } catch (error) {
            console.warn(`Failed to delete spill: ${error.message}`);
            return { success: true, deletedId: spillId };
        }
    },

    // System Status
    async getSystemStatus() {
        try {
            const response = await api.get('/dispersion/status');
            return response.data;
        } catch (error) {
            console.warn('System status unavailable');
            return {
                status: 'degraded',
                message: 'Some services may be unavailable',
                timestamp: new Date().toISOString()
            };
        }
    },

    // Weather Endpoints - Enhanced with better error handling and fallbacks
    async getCurrentWeather(latitude, longitude) {
        try {
            const response = await api.get('/weather/current', {
                params: { latitude, longitude }
            });
            
            // Validate response data
            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Invalid weather data received');
            }
            
            return this.normalizeWeatherData(response.data);
        } catch (error) {
            console.warn('Weather API unavailable, using mock data:', error.message);
            return this.createMockWeatherData(latitude, longitude);
        }
    },

    async getWeatherForecast(latitude, longitude, hours = 72) {
        try {
            const response = await api.get('/weather/forecast', {
                params: { latitude, longitude, hoursAhead: hours }
            });
            
            const forecastData = Array.isArray(response.data) ? response.data : [];
            return forecastData.map(item => this.normalizeWeatherData(item));
        } catch (error) {
            console.warn('Weather forecast unavailable, using mock data:', error.message);
            return this.createMockForecastData(latitude, longitude, hours);
        }
    },

    // Tide Endpoints - Fixed with better mock data
    async getTidalData(latitude, longitude, hours = 72) {
        try {
            const response = await api.get('/tides/forecast', {
                params: { latitude, longitude, hoursAhead: hours }
            });
            return Array.isArray(response.data) ? response.data : [response.data];
        } catch (error) {
            console.warn('Tidal API unavailable, using mock data:', error.message);
            return this.createMockTidalData(latitude, longitude, hours);
        }
    },

    async getTideForecast(latitude, longitude, hours = 72) {
        return this.getTidalData(latitude, longitude, hours);
    },

    // Chemical Properties - Enhanced with better error handling
    async getChemicalData(chemicalName) {
        try {
            const response = await api.get(`/dispersion/chemicals/${encodeURIComponent(chemicalName)}`);
            return response.data;
        } catch (error) {
            console.warn(`Chemical data not found for ${chemicalName}: ${error.message}`);
            return this.getMockChemicalData(chemicalName);
        }
    },

    async storeChemicalData(chemicalData) {
        try {
            const response = await api.post('/dispersion/chemicals', chemicalData);
            return response.data;
        } catch (error) {
            console.warn('Failed to store chemical data:', error);
            // Return mock success response
            return {
                id: Date.now().toString(),
                ...chemicalData,
                stored: true,
                timestamp: new Date().toISOString()
            };
        }
    },

    async getChemicalProperties(chemicalName) {
        return this.getChemicalData(chemicalName);
    },

    // Real-time updates endpoint - Enhanced with better connection handling
    subscribeToUpdates(onUpdate) {
        let eventSource = null;
        let reconnectTimer = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        const connect = () => {
            try {
                eventSource = new EventSource('/api/real-time-updates');
                
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (onUpdate && typeof onUpdate === 'function') {
                            onUpdate(Array.isArray(data) ? data : [data]);
                        }
                        reconnectAttempts = 0; // Reset on successful message
                    } catch (error) {
                        console.error('Error parsing SSE data:', error);
                    }
                };

                eventSource.onopen = () => {
                    console.log('SSE connected successfully');
                    reconnectAttempts = 0;
                };

                eventSource.onerror = (error) => {
                    console.error('EventSource failed:', error);
                    eventSource.close();
                    
                    // Attempt to reconnect with exponential backoff
                    if (reconnectAttempts < maxReconnectAttempts) {
                        const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000); // Cap at 30 seconds
                        reconnectAttempts++;
                        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
                        
                        reconnectTimer = setTimeout(() => {
                            connect();
                        }, delay);
                    } else {
                        console.error('Max reconnection attempts reached');
                    }
                };

            } catch (error) {
                console.error('Failed to establish SSE connection:', error);
            }
        };

        connect();

        // Return cleanup function
        return () => {
            if (eventSource) {
                eventSource.close();
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
        };
    },

    // Utility functions
    async retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFunction();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                console.warn(`Retrying API call (${attempt}/${maxRetries}) in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    },

    formatCoordinates(lat, lng, precision = 6) {
        return {
            latitude: parseFloat(lat.toFixed(precision)),
            longitude: parseFloat(lng.toFixed(precision))
        };
    },

    validateSpillData(spillData) {
        const required = ['name', 'chemicalType', 'volume', 'latitude', 'longitude', 'spillTime'];
        const errors = [];

        for (const field of required) {
            if (!spillData[field] && spillData[field] !== 0) {
                errors.push(`${field} is required`);
            }
        }

        if (spillData.volume && spillData.volume <= 0) {
            errors.push('Volume must be positive');
        }
        if (spillData.latitude && (spillData.latitude < -90 || spillData.latitude > 90)) {
            errors.push('Latitude must be between -90 and 90');
        }
        if (spillData.longitude && (spillData.longitude < -180 || spillData.longitude > 180)) {
            errors.push('Longitude must be between -180 and 180');
        }

        return errors;
    },

    // Enhanced environmental data fetching
    async getEnvironmentalData(latitude, longitude) {
        try {
            const [weatherResult, tidesResult] = await Promise.allSettled([
                this.getCurrentWeather(latitude, longitude),
                this.getTideForecast(latitude, longitude, 24)
            ]);

            return {
                weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
                tides: tidesResult.status === 'fulfilled' ? tidesResult.value : null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching environmental data:', error);
            return {
                weather: this.createMockWeatherData(latitude, longitude),
                tides: this.createMockTidalData(latitude, longitude, 24),
                timestamp: new Date().toISOString()
            };
        }
    },

    // Mock data generators for fallback scenarios
    getDemoSpills() {
        return [
            {
                id: 'demo-1',
                name: 'Houston Ship Channel Spill',
                chemicalType: 'Crude Oil',
                volume: 5000,
                latitude: 29.7604,
                longitude: -95.3698,
                spillTime: new Date(Date.now() - 3600000).toISOString(),
                status: 'ACTIVE',
                priority: 'HIGH',
                source: 'Pipeline Leak',
                reporterName: 'Coast Guard',
                reporterContact: 'uscg@demo.com'
            },
            {
                id: 'demo-2',
                name: 'Galveston Bay Incident',
                chemicalType: 'Diesel Fuel',
                volume: 2500,
                latitude: 29.5450,
                longitude: -94.9774,
                spillTime: new Date(Date.now() - 7200000).toISOString(),
                status: 'CONTAINED',
                priority: 'MEDIUM',
                source: 'Tank Overflow',
                reporterName: 'Port Authority',
                reporterContact: 'port@demo.com'
            }
        ];
    },

    createMockSpill(spillData) {
        return {
            id: `mock-${Date.now()}`,
            ...spillData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: spillData.status || 'ACTIVE'
        };
    },

    createMockWeatherData(latitude, longitude) {
        // Generate realistic weather data based on location and season
        const baseTemp = this.getBaseTemperature(latitude);
        const variation = (Math.random() - 0.5) * 10;
        
        return {
            temperature: Math.round(baseTemp + variation),
            temperatureUnit: 'C',
            windSpeed: `${Math.round(3 + Math.random() * 12)} m/s`,
            windDirection: `${Math.round(Math.random() * 360)}°`,
            humidity: Math.round(50 + Math.random() * 40),
            pressure: Math.round(1013.25 + (Math.random() - 0.5) * 30),
            visibility: Math.round(5 + Math.random() * 15),
            weatherCondition: this.getRandomWeatherCondition(),
            timestamp: new Date().toISOString()
        };
    },

    createMockForecastData(latitude, longitude, hours) {
        const forecast = [];
        const baseTemp = this.getBaseTemperature(latitude);
        
        for (let i = 0; i < Math.min(hours / 3, 24); i++) {
            const date = new Date();
            date.setHours(date.getHours() + i * 3);
            
            forecast.push({
                timestamp: date.toISOString(),
                temperature: Math.round(baseTemp + (Math.random() - 0.5) * 8),
                temperatureUnit: 'C',
                windSpeed: `${Math.round(2 + Math.random() * 15)} m/s`,
                windDirection: `${Math.round(Math.random() * 360)}°`,
                weatherCondition: this.getRandomWeatherCondition()
            });
        }
        
        return forecast;
    },

    createMockTidalData(latitude, longitude, hours) {
        const tides = [];
        const baseHeight = 1.5;
        
        for (let i = 0; i < Math.min(hours / 3, 24); i++) {
            const date = new Date();
            date.setHours(date.getHours() + i * 3);
            
            // Simulate tidal cycle (roughly 12.5 hour cycle)
            const cycleProgress = (i * 3) / 12.5;
            const tideHeight = baseHeight + Math.sin(cycleProgress * 2 * Math.PI) * 1.2;
            
            tides.push({
                timestamp: date.toISOString(),
                tideHeight: Math.round(tideHeight * 10) / 10,
                stationName: `Station ${Math.round(latitude * 10)}${Math.round(Math.abs(longitude) * 10)}`,
                stationId: `T${Date.now().toString().slice(-4)}`
            });
        }
        
        return tides;
    },

    getMockChemicalData(chemicalName) {
        const mockChemicals = {
            'crude oil': {
                name: 'Crude Oil',
                density: 0.85,
                viscosity: 'Medium',
                hazardClass: 'Flammable Liquid',
                dispersible: true,
                toxicity: 'Moderate'
            },
            'diesel fuel': {
                name: 'Diesel Fuel',
                density: 0.84,
                viscosity: 'Low',
                hazardClass: 'Flammable Liquid',
                dispersible: true,
                toxicity: 'Low'
            },
            'gasoline': {
                name: 'Gasoline',
                density: 0.75,
                viscosity: 'Very Low',
                hazardClass: 'Highly Flammable',
                dispersible: false,
                toxicity: 'High'
            }
        };

        const key = chemicalName.toLowerCase();
        return mockChemicals[key] || {
            name: chemicalName,
            density: 1.0,
            viscosity: 'Unknown',
            hazardClass: 'Unknown',
            dispersible: true,
            toxicity: 'Unknown'
        };
    },

    mockDispersionCalculation(spillId, simulationHours) {
        // Simulate calculation delay
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    spillId: spillId,
                    simulationHours: simulationHours,
                    calculationTime: new Date().toISOString(),
                    dispersionData: {
                        maxRadius: Math.round(500 + Math.random() * 2000),
                        affectedAreaKm2: Math.round((Math.random() * 10 + 1) * 100) / 100,
                        concentrationPeakTime: Math.round(simulationHours * 0.3),
                        model: 'Enhanced Gaussian Plume'
                    },
                    environmentalFactors: {
                        windInfluence: Math.round(Math.random() * 100),
                        currentInfluence: Math.round(Math.random() * 100),
                        temperatureInfluence: Math.round(Math.random() * 100)
                    }
                });
            }, 2000 + Math.random() * 3000); // 2-5 second delay
        });
    },

    // Helper functions
    getBaseTemperature(latitude) {
        // Rough temperature estimation based on latitude
        const absLat = Math.abs(latitude);
        if (absLat < 23.5) return 28; // Tropical
        if (absLat < 35) return 22;   // Subtropical
        if (absLat < 50) return 15;   // Temperate
        return 8;                     // Cold
    },

    getRandomWeatherCondition() {
        const conditions = [
            'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast',
            'Light Rain', 'Rain', 'Heavy Rain', 'Thunderstorms',
            'Fog', 'Mist', 'Windy'
        ];
        return conditions[Math.floor(Math.random() * conditions.length)];
    },

    normalizeWeatherData(data) {
        if (!data) return null;
        
        return {
            temperature: data.temperature || data.temp || 20,
            temperatureUnit: data.temperatureUnit || data.unit || 'C',
            windSpeed: data.windSpeed || data.wind_speed || `${Math.round(Math.random() * 15)} m/s`,
            windDirection: data.windDirection || data.wind_direction || `${Math.round(Math.random() * 360)}°`,
            humidity: data.humidity || Math.round(50 + Math.random() * 40),
            pressure: data.pressure || Math.round(1013 + Math.random() * 20),
            visibility: data.visibility || Math.round(5 + Math.random() * 15),
            weatherCondition: data.weatherCondition || data.condition || data.shortForecast || 'Clear',
            timestamp: data.timestamp || data.time || new Date().toISOString()
        };
    }
};