package com.dispersion.controller;

import com.dispersion.model.TideData;
import com.dispersion.service.TideService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tides")
@CrossOrigin(origins = "*")
public class TideController {

    private final TideService tideService;

    // FIXED: Removed unnecessary @Autowired (Spring handles this automatically)
    public TideController(TideService tideService) {
        this.tideService = tideService;
    }

    @GetMapping("/forecast")
    public ResponseEntity<List<TideData>> getTideForecast(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "72") int hoursAhead) {

        try {
            System.out.println("Fetching tide forecast for: " + latitude + ", " + longitude);
            List<TideData> forecast = tideService.getTideForecast(latitude, longitude, hoursAhead);
            return ResponseEntity.ok(forecast);
        } catch (Exception e) {
            System.err.println("Error fetching tide forecast: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "TideController",
                "source", "NOAA Tides and Currents"));
    }
}
