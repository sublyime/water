package com.dispersion.controller;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.dto.SpillRequest;
import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.dispersion.service.SpillService;
import com.dispersion.service.WeatherService;
import com.dispersion.service.TideService;
import com.dispersion.service.ChemicalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dispersion")
@CrossOrigin(origins = "*")
public class MapController {

    @Autowired
    private DispersionService dispersionService;

    @Autowired
    private SpillService spillService;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private TideService tideService;

    @Autowired
    private ChemicalService chemicalService;

    @GetMapping("/spills")
    public ResponseEntity<List<Spill>> getActiveSpills() {
        List<Spill> spills = dispersionService.getActiveSpills();
        return ResponseEntity.ok(spills);
    }

    @GetMapping("/spills/all")
    public ResponseEntity<List<Spill>> getAllSpills() {
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
    public ResponseEntity<Spill> createSpill(@Valid @RequestBody SpillRequest spillRequest) {
        try {
            // Get chemical properties from PubChem
            chemicalService.getOrFetchChemicalProperties(spillRequest.getChemicalType());

            // Create spill with environmental data
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
            @RequestParam String status) {
        try {
            Spill.SpillStatus spillStatus = Spill.SpillStatus.valueOf(status.toUpperCase());
            Spill spill = dispersionService.updateSpillStatus(id, spillStatus);
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
