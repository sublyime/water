package com.dispersion.controller;

import com.dispersion.model.WeatherData;
import com.dispersion.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/weather")
@CrossOrigin(origins = "*")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/current")
    public ResponseEntity<WeatherData> getCurrentWeather(
            @RequestParam double latitude,
            @RequestParam double longitude) {

        try {
            System.out.println("Fetching current weather for: " + latitude + ", " + longitude);
            WeatherData weather = weatherService.getCurrentWeather(latitude, longitude);
            return ResponseEntity.ok(weather);
        } catch (Exception e) {
            System.err.println("Error fetching current weather: " + e.getMessage());
            // Return mock weather data for development
            WeatherData mockWeather = createMockWeather();
            return ResponseEntity.ok(mockWeather);
        }
    }

    @GetMapping("/forecast")
    public ResponseEntity<List<WeatherData>> getWeatherForecast(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "72") int hoursAhead) {

        try {
            System.out.println("Fetching weather forecast for: " + latitude + ", " + longitude);
            List<WeatherData> forecast = weatherService.getWeatherForecast(latitude, longitude, hoursAhead);
            return ResponseEntity.ok(forecast);
        } catch (Exception e) {
            System.err.println("Error fetching weather forecast: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    // FIXED: Create mock weather data using BigDecimal
    private WeatherData createMockWeather() {
        WeatherData weather = new WeatherData();
        weather.setTemperature(BigDecimal.valueOf(22.0));
        weather.setWindSpeed(BigDecimal.valueOf(5.5));
        weather.setWindDirection(BigDecimal.valueOf(180.0));
        weather.setHumidity(BigDecimal.valueOf(65.0));
        weather.setPressure(BigDecimal.valueOf(1013.25));
        weather.setVisibility(BigDecimal.valueOf(10.0));
        weather.setWeatherCondition("Partly Cloudy");
        return weather;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "WeatherController",
                "source", "National Weather Service"));
    }
}
