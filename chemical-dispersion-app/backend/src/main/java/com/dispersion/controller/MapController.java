package com.dispersion.controller;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.dispersion.service.SpillService; // Add this import if not already present

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dispersion")
@CrossOrigin(origins = "*")
public class MapController {

    @Autowired
    private DispersionService dispersionService;

    @Autowired
    private SpillService spillService; // Inject SpillService for the new method

    @GetMapping("/spills")
    public ResponseEntity<List<Spill>> getActiveSpills() { // Renamed for clarity; returns active spills
        List<Spill> spills = dispersionService.getActiveSpills();
        return ResponseEntity.ok(spills);
    }

    @GetMapping("/spills/all")
    public ResponseEntity<List<Spill>> getAllSpills() { // Moved from SpillController; returns ALL spills
        List<Spill> spills = spillService.findAll();
        return ResponseEntity.ok(spills);
    }

    @GetMapping("/spills/{id}")
    public ResponseEntity<Spill> getSpillById(@PathVariable UUID id) {
        try {
            Spill spill = dispersionService.getSpillById(id);
            return ResponseEntity.ok(spill);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/spills")
    public ResponseEntity<Spill> createSpill(@RequestBody com.dispersion.dto.SpillRequest spillRequest) {
        try {
            Spill spill = dispersionService.createSpill(spillRequest);
            return ResponseEntity.ok(spill);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/spills/{id}/calculate")
    public ResponseEntity<DispersionResponse> calculateDispersion(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "24") int simulationHours) {
        try {
            DispersionResponse response = dispersionService.calculateDispersion(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/spills/{id}/calculations")
    public ResponseEntity<List<DispersionResponse>> getCalculationHistory(@PathVariable UUID id) {
        List<DispersionResponse> history = dispersionService.getCalculationHistory(id);
        return ResponseEntity.ok(history);
    }

    @PutMapping("/spills/{id}/status")
    public ResponseEntity<Spill> updateSpillStatus(
            @PathVariable UUID id,
            @RequestParam Spill.SpillStatus status) {
        try {
            Spill spill = dispersionService.updateSpillStatus(id, status);
            return ResponseEntity.ok(spill);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/spills/{id}")
    public ResponseEntity<Void> deleteSpill(@PathVariable UUID id) {
        try {
            dispersionService.deleteSpill(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/spills/area")
    public ResponseEntity<List<Spill>> getSpillsInArea(
            @RequestParam double minLat,
            @RequestParam double maxLat,
            @RequestParam double minLon,
            @RequestParam double maxLon) {
        List<Spill> spills = dispersionService.getSpillsInArea(minLat, maxLat, minLon, maxLon);
        return ResponseEntity.ok(spills);
    }
}
