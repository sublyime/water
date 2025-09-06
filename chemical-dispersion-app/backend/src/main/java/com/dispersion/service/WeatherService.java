package com.dispersion.service;

import com.dispersion.model.WeatherData;
import com.dispersion.repository.WeatherRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {

    private final WeatherRepository weatherRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${external-apis.nws.base-url}")
    private String nwsBaseUrl;

    @Value("${external-apis.nws.user-agent}")
    private String userAgent;

    public WeatherService(
            WeatherRepository weatherRepository,
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {
        this.weatherRepository = weatherRepository;
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public WeatherData getCurrentWeather(double latitude, double longitude) {
        try {
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

            String weatherUrl = String.format("%s/gridpoints/%s/%d,%d", nwsBaseUrl, gridId, gridX, gridY);
            String weatherResponse = webClient.get()
                    .uri(weatherUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            WeatherData weatherData = parseNWSWeatherData(weatherResponse, latitude, longitude);
            weatherRepository.save(weatherData);
            return weatherData;
        } catch (Exception e) {
            System.err.println("Error fetching weather data: " + e.getMessage());
            return getDefaultWeatherData(latitude, longitude);
        }
    }

    public List<WeatherData> getWeatherForecast(double latitude, double longitude, int hoursAhead) {
        try {
            String gridUrl = String.format("%s/points/%.4f,%.4f", nwsBaseUrl, latitude, longitude);
            String gridResponse = webClient.get()
                    .uri(gridUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode gridJson = objectMapper.readTree(gridResponse);
            String forecastHourlyUrl = gridJson.get("properties").get("forecastHourly").asText();

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

    private WeatherData parseNWSWeatherData(String response, double latitude, double longitude) {
        try {
            JsonNode json = objectMapper.readTree(response);
            JsonNode properties = json.get("properties");

            WeatherData weather = new WeatherData();
            weather.setLatitude(BigDecimal.valueOf(latitude));
            weather.setLongitude(BigDecimal.valueOf(longitude));
            weather.setTimestamp(LocalDateTime.now());

            JsonNode tempValues = properties.get("temperature").get("values");
            if (tempValues.isArray() && tempValues.size() > 0) {
                double tempC = tempValues.get(0).get("value").asDouble();
                weather.setTemperature(BigDecimal.valueOf(tempC));
            }

            JsonNode humidityValues = properties.get("relativeHumidity").get("values");
            if (humidityValues.isArray() && humidityValues.size() > 0) {
                double humidity = humidityValues.get(0).get("value").asDouble();
                weather.setHumidity(BigDecimal.valueOf(humidity));
            }

            JsonNode windSpeedValues = properties.get("windSpeed").get("values");
            if (windSpeedValues.isArray() && windSpeedValues.size() > 0) {
                double windSpeedKmh = windSpeedValues.get(0).get("value").asDouble();
                double windSpeedMs = windSpeedKmh / 3.6;
                weather.setWindSpeed(BigDecimal.valueOf(windSpeedMs));
            }

            JsonNode windDirValues = properties.get("windDirection").get("values");
            if (windDirValues.isArray() && windDirValues.size() > 0) {
                double windDir = windDirValues.get(0).get("value").asDouble();
                weather.setWindDirection(BigDecimal.valueOf(windDir));
            }

            JsonNode pressureValues = properties.get("pressure").get("values");
            if (pressureValues.isArray() && pressureValues.size() > 0) {
                double pressure = pressureValues.get(0).get("value").asDouble();
                weather.setPressure(BigDecimal.valueOf(pressure));
            }

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

    private List<WeatherData> parseNWSForecastData(String response, double latitude, double longitude, int hoursAhead) {
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

                String startTime = period.get("startTime").asText();
                weather.setTimestamp(LocalDateTime.parse(startTime, DateTimeFormatter.ISO_DATE_TIME));

                double tempF = period.get("temperature").asDouble();
                double tempC = (tempF - 32) * 5.0 / 9.0;
                weather.setTemperature(BigDecimal.valueOf(tempC));

                if (period.has("relativeHumidity") && !period.get("relativeHumidity").isNull()) {
                    JsonNode humidityNode = period.get("relativeHumidity");
                    if (humidityNode.has("value") && !humidityNode.get("value").isNull()) {
                        weather.setHumidity(BigDecimal.valueOf(humidityNode.get("value").asDouble()));
                    } else {
                        weather.setHumidity(BigDecimal.valueOf(70.0));
                    }
                } else {
                    weather.setHumidity(BigDecimal.valueOf(70.0));
                }

                String windSpeedStr = period.get("windSpeed").asText();
                double windSpeed = parseWindSpeed(windSpeedStr);
                weather.setWindSpeed(BigDecimal.valueOf(windSpeed));

                String windDirection = period.get("windDirection").asText();
                double windDir = parseWindDirection(windDirection);
                weather.setWindDirection(BigDecimal.valueOf(windDir));

                // Defaults where not provided
                weather.setPressure(BigDecimal.valueOf(101_325.0));
                weather.setVisibility(BigDecimal.valueOf(10_000.0));

                forecast.add(weather);
            }
        } catch (Exception e) {
            System.err.println("Error parsing NWS forecast data: " + e.getMessage());
            return generateDefaultForecast(latitude, longitude, hoursAhead);
        }
        return forecast;
    }

    private double parseWindSpeed(String windSpeedStr) {
        try {
            String s = windSpeedStr.toLowerCase().replace("mph", "").trim();
            if (s.contains("to")) {
                String[] parts = s.split("to");
                double min = Double.parseDouble(parts[0].trim());
                double max = Double.parseDouble(parts[1].trim());
                double avgMph = (min + max) / 2.0;
                return avgMph * 0.44704; // mph -> m/s
            } else {
                double mph = Double.parseDouble(s);
                return mph * 0.44704;
            }
        } catch (Exception e) {
            return 5.0; // default m/s
        }
    }

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
                return 270.0; // default West
        }
    }

    private List<WeatherData> generateDefaultForecast(double latitude, double longitude, int hoursAhead) {
        List<WeatherData> forecast = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < hoursAhead; i++) {
            WeatherData weather = new WeatherData();
            weather.setLatitude(BigDecimal.valueOf(latitude));
            weather.setLongitude(BigDecimal.valueOf(longitude));
            weather.setTimestamp(now.plusHours(i));

            // Simulate daily temperature variation around 15 °C
            double tempVariation = Math.sin(i * Math.PI / 12) * 5;
            weather.setTemperature(BigDecimal.valueOf(15.0 + tempVariation));
            weather.setHumidity(BigDecimal.valueOf(70.0));
            weather.setWindSpeed(BigDecimal.valueOf(3.0));
            weather.setWindDirection(BigDecimal.valueOf(180.0));
            weather.setPressure(BigDecimal.valueOf(101_325.0));
            weather.setVisibility(BigDecimal.valueOf(10_000.0));

            forecast.add(weather);
        }
        return forecast;
    }

    private WeatherData getDefaultWeatherData(double latitude, double longitude) {
        WeatherData weather = new WeatherData();
        weather.setLatitude(BigDecimal.valueOf(latitude));
        weather.setLongitude(BigDecimal.valueOf(longitude));
        weather.setTimestamp(LocalDateTime.now());
        weather.setTemperature(BigDecimal.valueOf(15.0));
        weather.setHumidity(BigDecimal.valueOf(70.0));
        weather.setWindSpeed(BigDecimal.valueOf(3.0));
        weather.setWindDirection(BigDecimal.valueOf(180.0));
        weather.setPressure(BigDecimal.valueOf(101_325.0));
        weather.setVisibility(BigDecimal.valueOf(10_000.0));
        return weather;
    }
}