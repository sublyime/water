import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
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

// Response interceptor for error handling
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
  // Spill Management
  async getAllSpills() {
    const response = await api.get('/dispersion/spills');
    return response.data;
  },

  async getSpillById(id) {
    const response = await api.get(`/dispersion/spills/${id}`);
    return response.data;
  },

  async createSpill(spillData) {
    const response = await api.post('/dispersion/spills', spillData);
    return response.data;
  },

  async updateSpillStatus(id, status) {
    const response = await api.put(`/dispersion/spills/${id}/status`, null, {
      params: { status }
    });
    return response.data;
  },

  async deleteSpill(id) {
    await api.delete(`/dispersion/spills/${id}`);
  },

  async getSpillsInArea(minLat, maxLat, minLon, maxLon) {
    const response = await api.get('/dispersion/spills/area', {
      params: { minLat, maxLat, minLon, maxLon }
    });
    return response.data;
  },

  // Dispersion Calculations
  async calculateDispersion(spillId, simulationHours = 24) {
    const response = await api.post(`/dispersion/spills/${spillId}/calculate`, null, {
      params: { simulationHours },
      timeout: 60000 // 60 seconds for heavy calculations
    });
    return response.data;
  },

  async getCalculationHistory(spillId) {
    const response = await api.get(`/dispersion/spills/${spillId}/calculations`);
    return response.data;
  },

  // Weather Data
  async getCurrentWeather(latitude, longitude) {
    const response = await api.get('/weather/current', {
      params: { latitude, longitude }
    });
    return response.data;
  },

  async getWeatherForecast(latitude, longitude, hoursAhead = 72) {
    const response = await api.get('/weather/forecast', {
      params: { latitude, longitude, hoursAhead }
    });
    return response.data;
  },

  // Tide Data
  async getCurrentTideData(latitude, longitude) {
    const response = await api.get('/tide/current', {
      params: { latitude, longitude }
    });
    return response.data;
  },

  async getTideForecast(latitude, longitude, hoursAhead = 72) {
    const response = await api.get('/tide/forecast', {
      params: { latitude, longitude, hoursAhead }
    });
    return response.data;
  },

  async getAvailableStations() {
    const response = await api.get('/tide/stations');
    return response.data;
  },

  // Health Check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
};

// Utility functions for API calls
export const apiUtils = {
  // Retry mechanism for failed requests
  async retry(apiCall, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.log(`🔄 Retrying API call (${i + 1}/${maxRetries}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  },

  // Batch API calls with rate limiting
  async batchRequests(requests, batchSize = 5, delay = 100) {
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  },

  // Format coordinates for API calls
  formatCoordinates(lat, lng, precision = 6) {
    return {
      latitude: parseFloat(lat.toFixed(precision)),
      longitude: parseFloat(lng.toFixed(precision))
    };
  },

  // Validate spill data before sending
  validateSpillData(spillData) {
    const required = ['name', 'chemicalType', 'volume', 'latitude', 'longitude', 'spillTime'];
    const errors = [];

    for (const field of required) {
      if (!spillData[field]) {
        errors.push(`${field} is required`);
      }
    }

    // Validate numeric fields
    if (spillData.volume && spillData.volume <= 0) {
      errors.push('Volume must be positive');
    }

    // Validate coordinates
    if (spillData.latitude && (spillData.latitude < -90 || spillData.latitude > 90)) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (spillData.longitude && (spillData.longitude < -180 || spillData.longitude > 180)) {
      errors.push('Longitude must be between -180 and 180');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Export default api instance for direct use
export default api;