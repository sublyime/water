package com.dispersion.controller;

import com.dispersion.model.WeatherData;
import com.dispersion.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/weather")
@CrossOrigin(origins = "*") // Allows requests from your frontend
public class WeatherController {

    private final WeatherService weatherService;

    @Autowired
    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/current")
    public ResponseEntity<WeatherData> getCurrentWeather(
            @RequestParam double latitude,
            @RequestParam double longitude) {
        WeatherData weather = weatherService.getCurrentWeather(latitude, longitude);
        return ResponseEntity.ok(weather);
    }

    @GetMapping("/forecast")
    public ResponseEntity<List<WeatherData>> getWeatherForecast(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "72") int hoursAhead) {
        List<WeatherData> forecast = weatherService.getWeatherForecast(latitude, longitude, hoursAhead);
        return ResponseEntity.ok(forecast);
    }
}