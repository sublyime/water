package com.dispersion.controller;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.dispersion.service.FluidDynamicsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/dispersion")
@CrossOrigin(origins = "*")
public class DispersionController {

    @Autowired
    private DispersionService dispersionService;

    @Autowired
    private FluidDynamicsService fluidDynamicsService;

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> home() {
        return ResponseEntity.ok(Map.of(
                "application", "Chemical Dispersion Modeling System",
                "version", "1.0.0",
                "status", "OPERATIONAL",
                "timestamp", LocalDateTime.now()));
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        return ResponseEntity.ok(Map.of(
                "version", "1.0.0",
                "description", "Water chemical dispersion modeling and monitoring system",
                "capabilities", List.of("Gaussian Plume Modeling", "Real-time Weather Integration",
                        "NOAA Tide Data", "PubChem Chemical Properties"),
                "supportedChemicals", "All PubChem database chemicals",
                "weatherSource", "National Weather Service API",
                "tidesSource", "NOAA Tides and Currents API"));
    }

    @PostMapping("/calculate")
    public ResponseEntity<DispersionResponse> calculateDispersion(
            @RequestParam UUID spillId,
            @RequestParam(defaultValue = "24") int simulationHours) {
        try {
            DispersionResponse response = dispersionService.calculateDispersion(spillId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/models")
    public ResponseEntity<List<Map<String, Object>>> getAvailableModels() {
        List<Map<String, Object>> models = List.of(
                Map.of("name", "Gaussian Plume", "description", "Standard atmospheric dispersion model"),
                Map.of("name", "ALOHA Compatible", "description", "EPA ALOHA compatible modeling"),
                Map.of("name", "Simple Diffusion", "description", "Basic diffusion calculation"));
        return ResponseEntity.ok(models);
    }

    @GetMapping("/grid/{spillId}")
    public ResponseEntity<FluidDynamicsService.DispersionGrid> getDispersionGrid(
            @PathVariable UUID spillId) {
        try {
            DispersionResponse response = dispersionService.calculateDispersion(spillId);
            return ResponseEntity.ok(response.getDispersionGrid());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        List<Spill> activeSpills = dispersionService.getActiveSpills();
        double totalVolume = activeSpills.stream().mapToDouble(s -> s.getVolume().doubleValue()).sum();
        long criticalSpills = activeSpills.stream()
                .filter(s -> s.getVolume().doubleValue() > 10000 ||
                        s.getChemicalType().toLowerCase().contains("toxic") ||
                        s.getChemicalType().toLowerCase().contains("hazard"))
                .count();

        return ResponseEntity.ok(Map.of(
                "activeSpills", activeSpills.size(),
                "totalSpills", dispersionService.getAllSpills().size(),
                "totalVolume", totalVolume,
                "criticalSpills", criticalSpills,
                "systemHealth", "OPERATIONAL",
                "lastUpdate", LocalDateTime.now()));
    }
}
