package com.dispersion.service;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.dto.SpillRequest;
import com.dispersion.model.Spill;
import com.dispersion.model.TideData;
import com.dispersion.model.WeatherData;
import com.dispersion.repository.SpillRepository;
import com.dispersion.service.FluidDynamicsService.DispersionGrid;
import com.dispersion.service.FluidDynamicsService.DispersionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DispersionService {

    @Autowired
    private SpillRepository spillRepository;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private TideService tideService;

    @Autowired
    private FluidDynamicsService fluidDynamicsService;

    public Spill createSpill(SpillRequest request) {
        Spill spill = new Spill();
        spill.setName(request.getName());
        spill.setChemicalType(request.getChemicalType());
        spill.setVolume(request.getVolume());
        spill.setLatitude(request.getLatitude());
        spill.setLongitude(request.getLongitude());
        spill.setSpillTime(request.getSpillTime());
        spill.setWaterDepth(request.getWaterDepth());
        spill.setStatus(Spill.SpillStatus.ACTIVE);
        return spillRepository.save(spill);
    }

    public DispersionResponse calculateDispersion(UUID spillId) {
        Spill spill = spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));

        WeatherData weather = weatherService.getCurrentWeather(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue());
        List<TideData> tides = tideService.getTideForecast(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                24);

        DispersionResult result = fluidDynamicsService.calculateDispersion(spill, weather, tides);

        DispersionResponse response = new DispersionResponse();
        response.setSpillId(spillId);
        response.setCalculationTime(LocalDateTime.now());
        response.setDispersionGrid(result.getDispersionGrid());
        response.setAffectedAreaKm2(BigDecimal.valueOf(calculateAffectedArea(result.getDispersionGrid())));

        return response;
    }

    private double calculateAffectedArea(DispersionGrid grid) {
        final double threshold = 0.01;
        int affectedCells = 0;
        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                if (grid.getConcentration(i, j) > threshold) {
                    affectedCells++;
                }
            }
        }
        double cellAreaM2 = grid.getCellSize() * grid.getCellSize();
        double totalAreaM2 = affectedCells * cellAreaM2;
        return totalAreaM2 / 1_000_000.0;
    }

    private double findMaxConcentration(DispersionGrid grid) {
        double maxConcentration = 0.0;
        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                double concentration = grid.getConcentration(i, j);
                if (concentration > maxConcentration) {
                    maxConcentration = concentration;
                }
            }
        }
        return maxConcentration;
    }

    public List<DispersionResponse> getCalculationHistory(UUID spillId) {
        // Implementation would retrieve calculation history from database
        // For now, returning empty list - would need to create a calculation history
        // table
        // and store each dispersion calculation result
        return new ArrayList<>();
    }

    public Spill updateSpillStatus(UUID spillId, Spill.SpillStatus status) {
        Spill spill = getSpillById(spillId);
        spill.setStatus(status);
        return spillRepository.save(spill);
    }

    public void deleteSpill(UUID spillId) {
        if (!spillRepository.existsById(spillId)) {
            throw new RuntimeException("Spill not found with id: " + spillId);
        }
        spillRepository.deleteById(spillId);
    }

    public List<Spill> getSpillsInArea(double minLat, double maxLat, double minLon, double maxLon) {
        return spillRepository.findSpillsInArea(
                BigDecimal.valueOf(minLat), BigDecimal.valueOf(maxLat),
                BigDecimal.valueOf(minLon), BigDecimal.valueOf(maxLon));
    }

    public List<Spill> getActiveSpills() {
        return spillRepository.findByStatus(Spill.SpillStatus.ACTIVE);
    }

    public List<Spill> getRecentSpills(int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        return spillRepository.findActiveSpillsSince(Spill.SpillStatus.ACTIVE, since);
    }

    public Spill getSpillById(UUID spillId) {
        return spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));
    }
}