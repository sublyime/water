package com.dispersion.controller;

import com.dispersion.dto.SpillRequest;
import com.dispersion.dto.DispersionResponse;
import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/dispersion")
@CrossOrigin(origins = "http://localhost:3000")
@Tag(name = "Dispersion", description = "Chemical spill dispersion modeling API")
public class DispersionController {

    @Autowired
    private DispersionService dispersionService;

    @Operation(summary = "Create a new chemical spill incident")
    @PostMapping("/spills")
    public ResponseEntity<Spill> createSpill(@Valid @RequestBody SpillRequest spillRequest) {
        try {
            Spill spill = dispersionService.createSpill(spillRequest);
            return new ResponseEntity<>(spill, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @Operation(summary = "Get all spill incidents")
    @GetMapping("/spills")
    public ResponseEntity<List<Spill>> getAllSpills() {
        List<Spill> spills = dispersionService.getAllSpills();
        return ResponseEntity.ok(spills);
    }

    @Operation(summary = "Get spill by ID")
    @GetMapping("/spills/{id}")
    public ResponseEntity<Spill> getSpillById(@PathVariable UUID id) {
        try {
            Spill spill = dispersionService.getSpillById(id);
            return ResponseEntity.ok(spill);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Calculate chemical dispersion for a spill")
    @PostMapping("/spills/{id}/calculate")
    public ResponseEntity<DispersionResponse> calculateDispersion(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "24") int simulationHours) {
        try {
            DispersionResponse response = dispersionService.calculateDispersion(id, simulationHours);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "Get dispersion calculation history for a spill")
    @GetMapping("/spills/{id}/calculations")
    public ResponseEntity<List<DispersionResponse>> getCalculationHistory(@PathVariable UUID id) {
        try {
            List<DispersionResponse> calculations = dispersionService.getCalculationHistory(id);
            return ResponseEntity.ok(calculations);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Update spill status")
    @PutMapping("/spills/{id}/status")
    public ResponseEntity<Spill> updateSpillStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        try {
            Spill updatedSpill = dispersionService.updateSpillStatus(id,
                    Spill.SpillStatus.valueOf(status.toUpperCase()));
            return ResponseEntity.ok(updatedSpill);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @Operation(summary = "Delete a spill incident")
    @DeleteMapping("/spills/{id}")
    public ResponseEntity<Void> deleteSpill(@PathVariable UUID id) {
        try {
            dispersionService.deleteSpill(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Get spills within a geographic area")
    @GetMapping("/spills/area")
    public ResponseEntity<List<Spill>> getSpillsInArea(
            @RequestParam double minLat,
            @RequestParam double maxLat,
            @RequestParam double minLon,
            @RequestParam double maxLon) {
        try {
            List<Spill> spills = dispersionService.getSpillsInArea(minLat, maxLat, minLon, maxLon);
            return ResponseEntity.ok(spills);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }
}