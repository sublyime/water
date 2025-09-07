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
        if (error.response?.status === 404) {
            throw new Error('Resource not found');
        } else if (error.response?.status === 400) {
            throw new Error(error.response.data.message || 'Invalid request');
        } else if (error.response?.status === 500) {
            throw new Error('Server error occurred');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - please try again');
        }
        throw error;
    }
);

export const apiService = {
    // Spill Endpoints - Return data directly
    async getAllSpills() {
        const response = await api.get('/dispersion/spills/all');
        return response.data;
    },

    async getActiveSpills() {
        const response = await api.get('/dispersion/spills');
        return response.data;
    },

    async createSpill(spillData) {
        const response = await api.post('/dispersion/spills', spillData);
        return response.data;
    },

    async updateSpillStatus(spillId, status) {
        const response = await api.put(`/dispersion/spills/${spillId}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    async calculateDispersion(spillId, simulationHours = 24) {
        const response = await api.post(`/dispersion/spills/${spillId}/calculate`, null, {
            params: { simulationHours }
        });
        return response.data;
    },

    // System Status
    async getSystemStatus() {
        const response = await api.get('/dispersion/status');
        return response.data;
    },

    // Weather Endpoints
    async getCurrentWeather(latitude, longitude) {
        const response = await api.get('/weather/current', {
            params: { latitude, longitude }
        });
        return response.data;
    },

    async getWeatherForecast(latitude, longitude, hours = 72) {
        const response = await api.get('/weather/forecast', {
            params: { latitude, longitude, hoursAhead: hours }
        });
        return response.data;
    },

    // Tide Endpoints - Fixed function names
    async getTidalData(latitude, longitude, hours = 72) {
        const response = await api.get('/tides/forecast', {
            params: { latitude, longitude, hoursAhead: hours }
        });
        return response.data;
    },

    async getTideForecast(latitude, longitude, hours = 72) {
        const response = await api.get('/tides/forecast', {
            params: { latitude, longitude, hoursAhead: hours }
        });
        return response.data;
    },

    // Chemical Properties - Added missing methods
    async getChemicalData(chemicalName) {
        try {
            const response = await api.get(`/dispersion/chemicals/${encodeURIComponent(chemicalName)}`);
            return response.data;
        } catch (error) {
            console.warn(`Chemical data not found for ${chemicalName}`);
            return null;
        }
    },

    async storeChemicalData(chemicalData) {
        const response = await api.post('/dispersion/chemicals', chemicalData);
        return response.data;
    },

    async getChemicalProperties(chemicalName) {
        try {
            const response = await api.get(`/dispersion/chemicals/${encodeURIComponent(chemicalName)}`);
            return response.data;
        } catch (error) {
            console.warn(`Chemical properties not found for ${chemicalName}`);
            return null;
        }
    },

    // Real-time updates endpoint
    subscribeToUpdates(onUpdate) {
        const eventSource = new EventSource('/api/real-time-updates');
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onUpdate(data);
            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
        };
        
        return () => eventSource.close();
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
            if (!spillData[field]) errors.push(`${field} is required`);
        }
        
        if (spillData.volume && spillData.volume <= 0) errors.push('Volume must be positive');
        if (spillData.latitude && (spillData.latitude < -90 || spillData.latitude > 90)) {
            errors.push('Latitude must be between -90 and 90');
        }
        if (spillData.longitude && (spillData.longitude < -180 || spillData.longitude > 180)) {
            errors.push('Longitude must be between -180 and 180');
        }
        
        return errors;
    }
};
