package com.dispersion.service;

import com.dispersion.model.WeatherData;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${external-apis.nws.base-url}")
    private String nwsBaseUrl;

    @Value("${external-apis.nws.user-agent}")
    private String userAgent;

    public WeatherService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl(nwsBaseUrl)
                .defaultHeader("User-Agent", userAgent)
                .build();
        this.objectMapper = objectMapper;
    }

    public WeatherData getCurrentWeather(double latitude, double longitude) {
        // Return the first hour of the forecast as a representation of current weather
        List<WeatherData> forecast = getWeatherForecast(latitude, longitude, 1);
        if (forecast.isEmpty()) {
            return new WeatherData();
        }
        return forecast.get(0);
    }

    public List<WeatherData> getWeatherForecast(double latitude, double longitude, int hoursAhead) {
        List<WeatherData> forecastList = new ArrayList<>();
        try {
            // Step 1: Get forecast grid from lat/lon
            String gridPointsUrl = String.format("/points/%.4f,%.4f", latitude, longitude);
            JsonNode gridResponse = webClient.get()
                    .uri(gridPointsUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            String forecastUrl = gridResponse.at("/properties/forecastHourly").asText();
            if (forecastUrl.isEmpty()) {
                System.err.println("Hourly forecast URL not found.");
                return List.of();
            }

            // Step 2: Get hourly forecast from the grid URL
            JsonNode forecastResponse = webClient.get()
                    .uri(forecastUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            JsonNode periods = forecastResponse.at("/properties/periods");
            if (periods.isArray()) {
                for (JsonNode period : periods) {
                    WeatherData weather = new WeatherData();
                    weather.setLatitude(BigDecimal.valueOf(latitude));
                    weather.setLongitude(BigDecimal.valueOf(longitude));
                    weather.setTemperature(BigDecimal.valueOf(period.get("temperature").asDouble()));
                    weather.setHumidity(BigDecimal.valueOf(period.at("/relativeHumidity/value").asDouble()));
                    weather.setWindSpeed(BigDecimal.valueOf(period.get("windSpeed").asDouble()));
                    weather.setWindDirection(BigDecimal.valueOf(period.get("windDirection").asDouble()));
                    weather.setWeatherCondition(period.get("shortForecast").asText());
                    weather.setTimestamp(ZonedDateTime.parse(period.get("startTime").asText()).toLocalDateTime());

                    forecastList.add(weather);
                    if (forecastList.size() >= hoursAhead) {
                        break;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching weather forecast: " + e.getMessage());
            // Return an empty list or default data instead of throwing
            return List.of();
        }
        return forecastList;
    }
}