package com.dispersion.controller;

import com.dispersion.model.TideData;
import com.dispersion.service.TideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/tides")
@CrossOrigin(origins = "*") // Allows requests from your frontend
public class TideController {

    private final TideService tideService;

    @Autowired
    public TideController(TideService tideService) {
        this.tideService = tideService;
    }

    @GetMapping("/forecast")
    public ResponseEntity<List<TideData>> getTideForecast(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "72") int hoursAhead) {
        List<TideData> forecast = tideService.getTideForecast(latitude, longitude, hoursAhead);
        return ResponseEntity.ok(forecast);
    }
}