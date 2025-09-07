import axios from 'axios';

// Change baseURL from '/api/v1' to '/api' to match your Spring Boot configuration
const api = axios.create({
  baseURL: '/api', // Removed /v1 to match your server.servlet.context-path=/api
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
  // Spill Endpoints
  async getAllSpills() {
    // This endpoint returns all spills, active or contained.
    return await api.get('/dispersion/spills/all');
  },

  async getActiveSpills() {
    return await api.get('/dispersion/spills');
  },

  async createSpill(spillData) {
    return await api.post('/dispersion/spills', spillData);
  },

  async updateSpillStatus(spillId, status) {
    return await api.put(`/dispersion/spills/${spillId}/status`, null, {
      params: { status }
    });
  },
  
  // Weather Endpoints
  async getCurrentWeather(latitude, longitude) {
    return await api.get('/weather/current', {
      params: { latitude, longitude }
    });
  },

  // Tide Endpoints
  async getTideForecast(latitude, longitude, hours) {
    return await api.get('/tides/forecast', {
      params: { latitude, longitude, hours }
    });
  },

  // Real-time updates endpoint
  subscribeToUpdates(onUpdate) {
    // Correct URL to use relative path without repeating /api
    const eventSource = new EventSource('/api/real-time-updates');
    
    eventSource.onmessage = (event) => {
      onUpdate(JSON.parse(event.data));
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
    };

    return () => eventSource.close();
  },

  // Other utility functions (keep these at the end)
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

  async batchRequests(requests, batchSize = 5, delay = 100) {
    const results = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
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
    if (spillData.latitude && (spillData.latitude < -90 || spillData.latitude > 90)) errors.push('Latitude must be between -90 and 90');
    if (spillData.longitude && (spillData.longitude < -180 || spillData.longitude > 180)) errors.push('Longitude must be between -180 and 180');
    return errors;
  }
};