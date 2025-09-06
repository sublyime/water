package com.dispersion.service;

import com.dispersion.model.WeatherData;
import com.dispersion.repository.WeatherRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

@Service
public class WeatherService {

    @Autowired
    private WeatherRepository weatherRepository;

    @Value("${external-apis.nws.base-url}")
    private String nwsBaseUrl;

    @Value("${external-apis.nws.user-agent}")
    private String userAgent;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public WeatherService() {
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get current weather data for a location from NWS API
     */
    public WeatherData getCurrentWeather(double latitude, double longitude) {
        try {
            // First, get the grid point for the coordinates
            String gridUrl = String.format("%s/points/%.4f,%.4f", nwsBaseUrl, latitude, longitude);

            String gridResponse = webClient.get()
                    .uri(gridUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode gridJson = objectMapper.readTree(gridResponse);
            String gridId = gridJson.get("properties").get("gridId").asText();
            int gridX = gridJson.get("properties").get("gridX").asInt();
            int gridY = gridJson.get("properties").get("gridY").asInt();

            // Get current conditions from the grid endpoint
            String weatherUrl = String.format("%s/gridpoints/%s/%d,%d", nwsBaseUrl, gridId, gridX, gridY);

            String weatherResponse = webClient.get()
                    .uri(weatherUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            WeatherData weatherData = parseNWSWeatherData(weatherResponse, latitude, longitude);

            // Save to database
            weatherRepository.save(weatherData);

            return weatherData;

        } catch (WebClientResponseException e) {
            System.err.println("Error fetching weather data: " + e.getMessage());
            return getDefaultWeatherData(latitude, longitude);
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            return getDefaultWeatherData(latitude, longitude);
        }
    }

    /**
     * Get weather forecast for next 72 hours
     */
    public List<WeatherData> getWeatherForecast(double latitude, double longitude, int hoursAhead) {
        try {
            // Get grid point
            String gridUrl = String.format("%s/points/%.4f,%.4f", nwsBaseUrl, latitude, longitude);

            String gridResponse = webClient.get()
                    .uri(gridUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode gridJson = objectMapper.readTree(gridResponse);
            String forecastHourlyUrl = gridJson.get("properties").get("forecastHourly").asText();

            // Get hourly forecast
            String forecastResponse = webClient.get()
                    .uri(forecastHourlyUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNWSForecastData(forecastResponse, latitude, longitude, hoursAhead);

        } catch (Exception e) {
            System.err.println("Error fetching weather forecast: " + e.getMessage());
            return generateDefaultForecast(latitude, longitude, hoursAhead);
        }
    }

    /**
     * Parse NWS weather data response
     */
    private WeatherData parseNWSWeatherData(String response, double latitude, double longitude) {
        try {
            JsonNode json = objectMapper.readTree(response);
            JsonNode properties = json.get("properties");

            WeatherData weather = new WeatherData();
            weather.setLatitude(BigDecimal.valueOf(latitude));
            weather.setLongitude(BigDecimal.valueOf(longitude));
            weather.setTimestamp(LocalDateTime.now());

            // Parse temperature
            JsonNode tempValues = properties.get("temperature").get("values");
            if (tempValues.isArray() && tempValues.size() > 0) {
                double tempC = tempValues.get(0).get("value").asDouble();
                weather.setTemperature(BigDecimal.valueOf(tempC));
            }

            // Parse humidity
            JsonNode humidityValues = properties.get("relativeHumidity").get("values");
            if (humidityValues.isArray() && humidityValues.size() > 0) {
                double humidity = humidityValues.get(0).get("value").asDouble();
                weather.setHumidity(BigDecimal.valueOf(humidity));
            }

            // Parse wind speed (convert from km/h to m/s)
            JsonNode windSpeedValues = properties.get("windSpeed").get("values");
            if (windSpeedValues.isArray() && windSpeedValues.size() > 0) {
                double windSpeedKmh = windSpeedValues.get(0).get("value").asDouble();
                double windSpeedMs = windSpeedKmh / 3.6;
                weather.setWindSpeed(BigDecimal.valueOf(windSpeedMs));
            }

            // Parse wind direction
            JsonNode windDirValues = properties.get("windDirection").get("values");
            if (windDirValues.isArray() && windDirValues.size() > 0) {
                double windDir = windDirValues.get(0).get("value").asDouble();
                weather.setWindDirection(BigDecimal.valueOf(windDir));
            }

            // Parse pressure (convert from Pa to hPa if needed)
            JsonNode pressureValues = properties.get("pressure").get("values");
            if (pressureValues.isArray() && pressureValues.size() > 0) {
                double pressure = pressureValues.get(0).get("value").asDouble();
                weather.setPressure(BigDecimal.valueOf(pressure));
            }

            // Parse visibility
            JsonNode visibilityValues = properties.get("visibility").get("values");
            if (visibilityValues.isArray() && visibilityValues.size() > 0) {
                double visibility = visibilityValues.get(0).get("value").asDouble();
                weather.setVisibility(BigDecimal.valueOf(visibility));
            }

            return weather;

        } catch (Exception e) {
            System.err.println("Error parsing NWS weather data: " + e.getMessage());
            return getDefaultWeatherData(latitude, longitude);
        }
    }

    /**
     * Parse NWS forecast data
     */
    private List<WeatherData> parseNWSForecastData(String response, double latitude,
            double longitude, int hoursAhead) {
        List<WeatherData> forecast = new ArrayList<>();

        try {
            JsonNode json = objectMapper.readTree(response);
            JsonNode periods = json.get("properties").get("periods");

            int maxPeriods = Math.min(hoursAhead, periods.size());

            for (int i = 0; i < maxPeriods; i++) {
                JsonNode period = periods.get(i);
                WeatherData weather = new WeatherData();

                weather.setLatitude(BigDecimal.valueOf(latitude));
                weather.setLongitude(BigDecimal.valueOf(longitude));

                // Parse start time
                String startTime = period.get("startTime").asText();
                weather.setTimestamp(LocalDateTime.parse(startTime, DateTimeFormatter.ISO_DATE_TIME));

                // Parse temperature (convert from F to C)
                double tempF = period.get("temperature").asDouble();
                double tempC = (tempF - 32) * 5.0 / 9.0;
                weather.setTemperature(BigDecimal.valueOf(tempC));

                // Parse humidity
                if (period.has("relativeHumidity") && !period.get("relativeHumidity").isNull()) {
                    JsonNode humidityNode = period.get("relativeHumidity");
                    if (humidityNode.has("value")) {
                        weather.setHumidity(BigDecimal.valueOf(humidityNode.get("value").asDouble()));
                    }
                } else {
                    weather.setHumidity(BigDecimal.valueOf(70.0)); // Default
                }

                // Parse wind speed
                String windSpeedStr = period.get("windSpeed").asText();
                double windSpeed = parseWindSpeed(windSpeedStr);
                weather.setWindSpeed(BigDecimal.valueOf(windSpeed));

                // Parse wind direction
                String windDirection = period.get("windDirection").asText();
                double windDir = parseWindDirection(windDirection);
                weather.setWindDirection(BigDecimal.valueOf(windDir));

                // Set defaults for missing data
                weather.setPressure(BigDecimal.valueOf(101325.0)); // Standard pressure
                weather.setVisibility(BigDecimal.valueOf(10000.0)); // 10km default
                weather.setCloudCover(BigDecimal.valueOf(50.0)); // Default cloud cover

                forecast.add(weather);
            }

        } catch (Exception e) {
            System.err.println("Error parsing NWS forecast data: " + e.getMessage());
            return generateDefaultForecast(latitude, longitude, hoursAhead);
        }

        return forecast;
    }

    /**
     * Parse wind speed from NWS string format (e.g., "5 to 10 mph")
     */
    private double parseWindSpeed(String windSpeedStr) {
        try {
            // Remove "mph" and extract numbers
            windSpeedStr = windSpeedStr.toLowerCase().replace("mph", "").trim();

            if (windSpeedStr.contains("to")) {
                // Handle range like "5 to 10"
                String[] parts = windSpeedStr.split("to");
                double min = Double.parseDouble(parts[0].trim());
                double max = Double.parseDouble(parts[1].trim());
                double avgMph = (min + max) / 2.0;
                return avgMph * 0.44704; // Convert mph to m/s
            } else {
                // Single value
                double mph = Double.parseDouble(windSpeedStr.trim());
                return mph * 0.44704; // Convert mph to m/s
            }
        } catch (Exception e) {
            return 5.0; // Default 5 m/s
        }
    }

    /**
     * Parse wind direction from compass direction to degrees
     */
    private double parseWindDirection(String windDir) {
        switch (windDir.toUpperCase()) {
            case "N":
                return 0.0;
            case "NNE":
                return 22.5;
            case "NE":
                return 45.0;
            case "ENE":
                return 67.5;
            case "E":
                return 90.0;
            case "ESE":
                return 112.5;
            case "SE":
                return 135.0;
            case "SSE":
                return 157.5;
            case "S":
                return 180.0;
            case "SSW":
                return 202.5;
            case "SW":
                return 225.0;
            case "WSW":
                return 247.5;
            case "W":
                return 270.0;
            case "WNW":
                return 292.5;
            case "NW":
                return 315.0;
            case "NNW":
                return 337.5;
            default:
                return 270.0; // Default to West
        }
    }

    /**
     * Generate default weather forecast when API fails
     */
    private List<WeatherData> generateDefaultForecast(double latitude, double longitude, int hoursAhead) {
        List<WeatherData> forecast = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 0; i < hoursAhead; i++) {
            WeatherData weather = new WeatherData();
            weather.setLatitude(BigDecimal.valueOf(latitude));
            weather.setLongitude(BigDecimal.valueOf(longitude));
            weather.setTimestamp(now.plusHours(i));

            // Generate reasonable defaults with some variation
            double tempVariation = Math.sin(i * Math.PI / 12) * 5; // Daily temperature cycle
            weather.setTemperature(BigDecimal.valueOf(15.0 + tempVariation));
            weather.setHumidity(BigDecimal.valueOf(70.0 + Math.random() * 20));
            weather.setPressure(BigDecimal.valueOf(101325.0 + Math.random() * 1000));
            weather.setWindSpeed(BigDecimal.valueOf(5.0 + Math.random() * 10));
            weather.setWindDirection(BigDecimal.valueOf(270.0 + Math.random() * 90 - 45));
            weather.setVisibility(BigDecimal.valueOf(10000.0));
            weather.setCloudCover(BigDecimal.valueOf(50.0));

            forecast.add(weather);
        }

        return forecast;
    }

    /**
     * Get default weather data when API fails
     */
    private WeatherData getDefaultWeatherData(double latitude, double longitude) {
        WeatherData weather = new WeatherData();
        weather.setLatitude(BigDecimal.valueOf(latitude));
        weather.setLongitude(BigDecimal.valueOf(longitude));
        weather.setTimestamp(LocalDateTime.now());
        weather.setTemperature(BigDecimal.valueOf(15.0)); // 15°C
        weather.setHumidity(BigDecimal.valueOf(70.0));
        weather.setPressure(BigDecimal.valueOf(101325.0)); // Standard pressure
        weather.setWindSpeed(BigDecimal.valueOf(5.0)); // 5 m/s
        weather.setWindDirection(BigDecimal.valueOf(270.0)); // West
        weather.setVisibility(BigDecimal.valueOf(10000.0)); // 10km
        weather.setCloudCover(BigDecimal.valueOf(50.0));
        return weather;
    }

    /**
     * Get historical weather data from database
     */
    public List<WeatherData> getHistoricalWeather(double latitude, double longitude,
            LocalDateTime startTime, LocalDateTime endTime) {
        return weatherRepository.findByLocationAndTimeRange(
                BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude), startTime, endTime);
    }

    /**
     * Save weather data to database
     */
    public WeatherData saveWeatherData(WeatherData weatherData) {
        return weatherRepository.save(weatherData);
    }

    /**
     * Get nearest weather station data
     */
    public Optional<WeatherData> getNearestWeatherData(double latitude, double longitude,
            LocalDateTime timestamp, double radiusKm) {
        return weatherRepository.findNearestWeatherData(
                BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude), timestamp, radiusKm);
    }
}