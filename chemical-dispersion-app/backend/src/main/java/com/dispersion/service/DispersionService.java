package com.dispersion.service;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.dto.SpillRequest;
import com.dispersion.model.FluidDynamicsService;
import com.dispersion.model.Spill;
import com.dispersion.repository.SpillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DispersionService {

    @Autowired
    private SpillRepository spillRepository;

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

    public DispersionResponse calculateDispersion(UUID spillId, int simulationHours) {
        Spill spill = getSpillById(spillId);
        FluidDynamicsService.DispersionResult result = simulateDispersion(spill, simulationHours);

        DispersionResponse response = new DispersionResponse();
        response.setSpillId(spill.getId());
        response.setSimulationHours(simulationHours);
        // Set other fields based on the simulation results
        return response;
    }

    private FluidDynamicsService.DispersionResult simulateDispersion(Spill spill, int hours) {
        // Implement your dispersion logic here
        return new FluidDynamicsService.DispersionResult();
    }

    public Spill getSpillById(UUID spillId) {
        return spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));
    }

    // Other methods remain unchanged
}

    public DispersionResponse calculateDispersion(UUID spillId, int simulationHours) {
        Spill spill = getSpillById(spillId);
        double lat = spill.getLatitude().doubleValue();
        double lon = spill.getLongitude().doubleValue();
        List<WeatherData> weatherData = weatherService.getWeatherForecast(lat, lon, simulationHours);
        List<TideData> tideData = tideService.getTideForecast(lat, lon, simulationHours);
        FluidDynamicsService.DispersionResult result = fluidDynamicsService.calculateDispersion(
                lat, lon, spill.getVolume().doubleValue(),
                spill.getChemicalType(), weatherData, tideData, simulationHours);
        return convertToResponse(result, spillId, simulationHours);
    }

    private DispersionResponse convertToResponse(FluidDynamicsService.DispersionResult result, UUID spillId,
            int simulationHours) {
        DispersionResponse response = new DispersionResponse();
        response.setSpillId(spillId);
        response.setSimulationHours(simulationHours);
        FluidDynamicsService.DispersionGrid grid = result.getGrid();
        response.setCenterLatitude(BigDecimal.valueOf(grid.getCenterLat()));
        response.setCenterLongitude(BigDecimal.valueOf(grid.getCenterLon()));
        response.setMaxConcentration(BigDecimal.valueOf(result.getMaxConcentration()));

        List<DispersionResponse.ConcentrationPoint> concentrationGrid = new ArrayList<>();
        double cellSize = grid.getCellSize();
        int gridSize = grid.getGridSize();
        double centerLat = grid.getCenterLat();
        double centerLon = grid.getCenterLon();
        double metersPerDegreeLat = 111320.0;
        double metersPerDegreeLon = 111320.0 * Math.cos(Math.toRadians(centerLat));

        for (int i = 0; i < gridSize; i++) {
            for (int j = 0; j < gridSize; j++) {
                double concentration = grid.getConcentration(i, j);
                if (concentration > 0.001) {
                    double xMeters = (i - gridSize / 2.0) * cellSize;
                    double yMeters = (j - gridSize / 2.0) * cellSize;
                    double latPoint = centerLat + yMeters / metersPerDegreeLat;
                    double lonPoint = centerLon + xMeters / metersPerDegreeLon;
                    concentrationGrid.add(new DispersionResponse.ConcentrationPoint(
                            BigDecimal.valueOf(latPoint), BigDecimal.valueOf(lonPoint),
                            BigDecimal.valueOf(concentration)));
                }
            }
        }
        response.setConcentrationGrid(concentrationGrid);
        response.setPlumeContours(generateContours(grid, new double[] { 1.0, 10.0, 100.0, 1000.0 }));

        double affectedArea = calculateAffectedArea(grid);
        response.setAffectedAreaKm2(BigDecimal.valueOf(affectedArea));

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("totalMass", result.getTotalMass());
        metadata.put("chemical",
                result.getChemical() != null ? result.getChemical().getClass().getSimpleName() : "Unknown");
        metadata.put("gridResolution", cellSize);
        metadata.put("gridSize", gridSize);
        response.setMetadata(metadata);

        return response;
    }

    private List<DispersionResponse.PlumeContour> generateContours(FluidDynamicsService.DispersionGrid grid,
            double[] levels) {
        List<DispersionResponse.PlumeContour> contours = new ArrayList<>();
        double centerLat = grid.getCenterLat();
        double centerLon = grid.getCenterLon();
        double cellSize = grid.getCellSize();
        int gridSize = grid.getGridSize();
        double metersPerDegreeLat = 111320.0;
        double metersPerDegreeLon = 111320.0 * Math.cos(Math.toRadians(centerLat));

        for (double level : levels) {
            List<DispersionResponse.LatLngPoint> contourPoints = new ArrayList<>();
            for (int i = 1; i < gridSize - 1; i++) {
                for (int j = 1; j < gridSize - 1; j++) {
                    double c00 = grid.getConcentration(i - 1, j - 1);
                    double c10 = grid.getConcentration(i, j - 1);
                    double c01 = grid.getConcentration(i - 1, j);
                    double c11 = grid.getConcentration(i, j);

                    boolean hasContour = (c00 >= level) != (c11 >= level) ||
                            (c10 >= level) != (c01 >= level);

                    if (hasContour && (c00 + c10 + c01 + c11) > level) {
                        double xMeters = (i - gridSize / 2.0) * cellSize;
                        double yMeters = (j - gridSize / 2.0) * cellSize;
                        double lat = centerLat + yMeters / metersPerDegreeLat;
                        double lon = centerLon + xMeters / metersPerDegreeLon;
                        contourPoints.add(new DispersionResponse.LatLngPoint(
                                BigDecimal.valueOf(lat), BigDecimal.valueOf(lon)));
                    }
                }
            }
            if (!contourPoints.isEmpty()) {
                contours.add(new DispersionResponse.PlumeContour(
                        level + " mg/L", contourPoints));
            }
        }
        return contours;
    }

    private double calculateAffectedArea(FluidDynamicsService.DispersionGrid grid) {
        int affectedCells = 0;
        double cellSize = grid.getCellSize();
        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                if (grid.getConcentration(i, j) > 0.001) {
                    affectedCells++;
                }
            }
        }
        double cellAreaM2 = cellSize * cellSize;
        double totalAreaM2 = affectedCells * cellAreaM2;
        return totalAreaM2 / 1_000_000.0; // Convert to km²
    }

    public List<DispersionResponse> getCalculationHistory(UUID spillId) {
        // Implement if you add a calculations table; for now, return empty
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
}
