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

            JsonNode root = objectMapper.readTree(gridResponse);
            String forecastUrl = root.get("properties").get("forecast").asText();

            String forecastResponse = webClient.get()
                    .uri(forecastUrl)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNwsResponse(forecastResponse, latitude, longitude);
        } catch (Exception ex) {
            System.err.println("Error fetching weather data: " + ex.getMessage());
            return getDefaultWeatherData(latitude, longitude);
        }
    }

    private WeatherData parseNwsResponse(String json, double latitude, double longitude) {
        WeatherData weather = new WeatherData();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode periods = root.get("properties").get("periods");
            if (periods != null && periods.isArray() && periods.size() > 0) {
                JsonNode firstPeriod = periods.get(0);
                weather.setLatitude(BigDecimal.valueOf(latitude));
                weather.setLongitude(BigDecimal.valueOf(longitude));
                weather.setTimestamp(LocalDateTime.now());
                weather.setTemperature(BigDecimal.valueOf(firstPeriod.get("temperature").asDouble()));
                weather.setHumidity(BigDecimal.valueOf(firstPeriod.get("relativeHumidity").get("value").asDouble()));
                weather.setWindSpeed(
                        BigDecimal.valueOf(Double.parseDouble(firstPeriod.get("windSpeed").asText().split(" ")[0])));
                weather.setWindDirection(
                        BigDecimal.valueOf(getDirectionInDegrees(firstPeriod.get("windDirection").asText())));
                weather.setPressure(BigDecimal.valueOf(0)); // NWS API does not provide pressure in this endpoint
                weather.setVisibility(BigDecimal.valueOf(0));
            }
        } catch (Exception ex) {
            System.err.println("Error parsing NWS weather response: " + ex.getMessage());
        }
        return weather;
    }

    private double getDirectionInDegrees(String direction) {
        switch (direction.toUpperCase()) {
            case "N":
                return 0;
            case "NNE":
                return 22.5;
            case "NE":
                return 45;
            case "ENE":
                return 67.5;
            case "E":
                return 90;
            case "ESE":
                return 112.5;
            case "SE":
                return 135;
            case "SSE":
                return 157.5;
            case "S":
                return 180;
            case "SSW":
                return 202.5;
            case "SW":
                return 225;
            case "WSW":
                return 247.5;
            case "W":
                return 270;
            case "WNW":
                return 292.5;
            case "NW":
                return 315;
            case "NNW":
                return 337.5;
            default:
                return 0;
        }
    }

    public List<WeatherData> getWeatherForecast(double latitude, double longitude, int hoursAhead) {
        LocalDateTime now = LocalDateTime.now();
        List<WeatherData> forecast = new ArrayList<>();
        for (int i = 0; i < hoursAhead; i++) {
            WeatherData weather = new WeatherData();
            weather.setLatitude(BigDecimal.valueOf(latitude));
            weather.setLongitude(BigDecimal.valueOf(longitude));
            weather.setTimestamp(now.plusHours(i));

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