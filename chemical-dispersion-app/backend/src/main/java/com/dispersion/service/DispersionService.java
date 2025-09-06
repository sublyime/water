package com.dispersion.service;

import com.dispersion.dto.SpillRequest;
import com.dispersion.dto.DispersionResponse;
import com.dispersion.model.Spill;
import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import com.dispersion.repository.SpillRepository;
import com.dispersion.service.FluidDynamicsService.DispersionResult;
import com.dispersion.service.FluidDynamicsService.DispersionGrid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class DispersionService {

    @Autowired
    private SpillRepository spillRepository;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private TideService tideService;

    @Autowired
    private FluidDynamicsService fluidDynamicsService;

    /**
     * Create a new chemical spill incident
     */
    public Spill createSpill(SpillRequest spillRequest) {
        Spill spill = new Spill();
        spill.setName(spillRequest.getName());
        spill.setChemicalType(spillRequest.getChemicalType());
        spill.setVolume(spillRequest.getVolume());
        spill.setLatitude(spillRequest.getLatitude());
        spill.setLongitude(spillRequest.getLongitude());
        spill.setSpillTime(spillRequest.getSpillTime());
        spill.setWaterDepth(spillRequest.getWaterDepth());
        spill.setStatus(Spill.SpillStatus.ACTIVE);

        return spillRepository.save(spill);
    }

    /**
     * Get all spill incidents
     */
    public List<Spill> getAllSpills() {
        return spillRepository.findAll();
    }

    /**
     * Get spill by ID
     */
    public Spill getSpillById(UUID id) {
        return spillRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + id));
    }

    /**
     * Calculate dispersion for a spill
     */
    public DispersionResponse calculateDispersion(UUID spillId, int simulationHours) {
        Spill spill = getSpillById(spillId);

        double lat = spill.getLatitude().doubleValue();
        double lon = spill.getLongitude().doubleValue();

        // Get environmental data
        List<WeatherData> weatherData = weatherService.getWeatherForecast(lat, lon, simulationHours);
        List<TideData> tideData = tideService.getTideForecast(lat, lon, simulationHours);

        // Perform fluid dynamics calculation
        DispersionResult result = fluidDynamicsService.calculateDispersion(
                lat, lon, spill.getVolume().doubleValue(),
                spill.getChemicalType(), weatherData, tideData, simulationHours);

        // Convert result to response DTO
        DispersionResponse response = convertToResponse(result, spillId, simulationHours);

        return response;
    }

    /**
     * Convert DispersionResult to DispersionResponse DTO
     */
    private DispersionResponse convertToResponse(DispersionResult result, UUID spillId, int simulationHours) {
        DispersionResponse response = new DispersionResponse(spillId, simulationHours);

        DispersionGrid grid = result.getGrid();
        response.setCenterLatitude(BigDecimal.valueOf(grid.getCenterLat()));
        response.setCenterLongitude(BigDecimal.valueOf(grid.getCenterLon()));
        response.setMaxConcentration(BigDecimal.valueOf(result.getMaxConcentration()));

        // Convert grid to concentration points
        List<DispersionResponse.ConcentrationPoint> concentrationGrid = new ArrayList<>();
        double cellSize = grid.getCellSize();
        int gridSize = grid.getGridSize();

        // Convert grid coordinates to geographic coordinates
        double centerLat = grid.getCenterLat();
        double centerLon = grid.getCenterLon();
        double metersPerDegreeLat = 111320.0; // approximately
        double metersPerDegreeLon = 111320.0 * Math.cos(Math.toRadians(centerLat));

        for (int i = 0; i < gridSize; i++) {
            for (int j = 0; j < gridSize; j++) {
                double concentration = grid.getConcentration(i, j);

                if (concentration > 0.001) { // Only include significant concentrations
                    // Convert grid indices to meters from center
                    double xMeters = (i - gridSize / 2.0) * cellSize;
                    double yMeters = (j - gridSize / 2.0) * cellSize;

                    // Convert meters to degrees
                    double lat = centerLat + yMeters / metersPerDegreeLat;
                    double lon = centerLon + xMeters / metersPerDegreeLon;

                    concentrationGrid.add(new DispersionResponse.ConcentrationPoint(
                            BigDecimal.valueOf(lat), BigDecimal.valueOf(lon),
                            BigDecimal.valueOf(concentration)));
                }
            }
        }

        response.setConcentrationGrid(concentrationGrid);

        // Generate contour lines for different concentration levels
        response.setPlumeContours(generateContours(grid, new double[] { 1.0, 10.0, 100.0, 1000.0 }));

        // Calculate affected area
        double affectedArea = calculateAffectedArea(grid);
        response.setAffectedAreaKm2(BigDecimal.valueOf(affectedArea));

        // Add metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("totalMass", result.getTotalMass());
        metadata.put("chemical", result.getChemical().getClass().getSimpleName());
        metadata.put("gridResolution", cellSize);
        metadata.put("gridSize", gridSize);
        response.setMetadata(metadata);

        return response;
    }

    /**
     * Generate contour lines for different concentration levels
     */
    private List<DispersionResponse.PlumeContour> generateContours(DispersionGrid grid, double[] levels) {
        List<DispersionResponse.PlumeContour> contours = new ArrayList<>();

        double centerLat = grid.getCenterLat();
        double centerLon = grid.getCenterLon();
        double cellSize = grid.getCellSize();
        int gridSize = grid.getGridSize();

        double metersPerDegreeLat = 111320.0;
        double metersPerDegreeLon = 111320.0 * Math.cos(Math.toRadians(centerLat));

        for (double level : levels) {
            List<DispersionResponse.LatLngPoint> contourPoints = new ArrayList<>();

            // Simple contour generation using marching squares algorithm (simplified)
            for (int i = 1; i < gridSize - 1; i++) {
                for (int j = 1; j < gridSize - 1; j++) {
                    double c00 = grid.getConcentration(i - 1, j - 1);
                    double c10 = grid.getConcentration(i, j - 1);
                    double c01 = grid.getConcentration(i - 1, j);
                    double c11 = grid.getConcentration(i, j);

                    // Check if contour line passes through this cell
                    boolean hasContour = (c00 >= level) != (c11 >= level) ||
                            (c10 >= level) != (c01 >= level);

                    if (hasContour && (c00 + c10 + c01 + c11) > level) {
                        // Convert grid position to geographic coordinates
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

    /**
     * Calculate affected area in km²
     */
    private double calculateAffectedArea(DispersionGrid grid) {
        int affectedCells = 0;
        double cellSize = grid.getCellSize();

        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                if (grid.getConcentration(i, j) > 0.001) { // Threshold for "affected"
                    affectedCells++;
                }
            }
        }

        double cellAreaM2 = cellSize * cellSize;
        double totalAreaM2 = affectedCells * cellAreaM2;
        return totalAreaM2 / 1_000_000.0; // Convert to km²
    }

    /**
     * Get calculation history for a spill
     */
    public List<DispersionResponse> getCalculationHistory(UUID spillId) {
        // This would typically query a separate calculations table
        // For now, return empty list as we haven't implemented persistence of
        // calculations
        return new ArrayList<>();
    }

    /**
     * Update spill status
     */
    public Spill updateSpillStatus(UUID spillId, Spill.SpillStatus status) {
        Spill spill = getSpillById(spillId);
        spill.setStatus(status);
        return spillRepository.save(spill);
    }

    /**
     * Delete a spill
     */
    public void deleteSpill(UUID spillId) {
        if (!spillRepository.existsById(spillId)) {
            throw new RuntimeException("Spill not found with id: " + spillId);
        }
        spillRepository.deleteById(spillId);
    }

    /**
     * Get spills within a geographic area
     */
    public List<Spill> getSpillsInArea(double minLat, double maxLat, double minLon, double maxLon) {
        return spillRepository.findSpillsInArea(
                BigDecimal.valueOf(minLat), BigDecimal.valueOf(maxLat),
                BigDecimal.valueOf(minLon), BigDecimal.valueOf(maxLon));
    }

    /**
     * Get active spills
     */
    public List<Spill> getActiveSpills() {
        return spillRepository.findByStatus(Spill.SpillStatus.ACTIVE);
    }

    /**
     * Get recent spills within specified hours
     */
    public List<Spill> getRecentSpills(int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        return spillRepository.findActiveSpillsSince(Spill.SpillStatus.ACTIVE, since);
    }
}