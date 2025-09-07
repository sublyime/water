package com.dispersion.service;

import com.dispersion.model.ChemicalProperties;
import com.dispersion.model.Spill;
import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FluidDynamicsService {

    // Rate limiting to prevent infinite calculations
    private final Map<String, Long> calculationCache = new ConcurrentHashMap<>();
    private static final long CALCULATION_COOLDOWN_MS = 5000; // 5 seconds cooldown

    /**
     * Calculate chemical dispersion using enhanced Gaussian plume model
     * with rate limiting to prevent infinite loops
     */
    public DispersionResult calculateDispersion(Spill spill, WeatherData weather, List<TideData> tides,
            ChemicalProperties chemical) {
        String spillId = spill.getId().toString();
        long currentTime = System.currentTimeMillis();

        // Check if calculation was done recently (rate limiting)
        Long lastCalculation = calculationCache.get(spillId);
        if (lastCalculation != null && (currentTime - lastCalculation) < CALCULATION_COOLDOWN_MS) {
            System.out.println("⚠️ RATE LIMITED: Calculation requested too soon for spill " + spillId);
            // Return cached result or throw exception
            throw new RuntimeException("Please wait " + (CALCULATION_COOLDOWN_MS / 1000)
                    + " seconds before recalculating dispersion for this spill");
        }

        // Update cache with current time
        calculationCache.put(spillId, currentTime);

        System.out.println("=== Enhanced Dispersion Calculation ===");
        System.out.println("Spill: " + spill.getName() + " (ID: " + spillId + ")");
        System.out.println("Chemical: "
                + (chemical != null ? chemical.getName() + " (CID: " + chemical.getCid() + ")" : "Unknown"));
        System.out.println("Weather: "
                + (weather != null
                        ? weather.getTemperature() + "°C, Wind: " + weather.getWindSpeed() + " m/s @ "
                                + weather.getWindDirection() + "°"
                        : "No weather data"));
        System.out.println("Tide data points: " + (tides != null ? tides.size() : 0));

        // Enhanced Gaussian plume model with chemical and environmental factors
        DispersionGrid dispersionGrid = new DispersionGrid(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                100, // cell size in meters
                100 // grid size (100x100 cells)
        );

        // Chemical properties with safety defaults
        double density = chemical != null && chemical.getDensity() != null ? chemical.getDensity().doubleValue()
                : 1000.0; // kg/m³
        double diffusionCoeff = chemical != null && chemical.getDiffusionCoefficient() != null
                ? chemical.getDiffusionCoefficient().doubleValue()
                : 0.0000001; // m²/s
        double decayRate = chemical != null && chemical.getDecayRate() != null ? chemical.getDecayRate().doubleValue()
                : 0.0000001; // 1/s
        double vaporPressure = chemical != null && chemical.getVaporPressure() != null
                ? chemical.getVaporPressure().doubleValue()
                : 100.0; // Pa

        // Weather factors with safety defaults
        double windSpeed = weather != null && weather.getWindSpeed() != null ? weather.getWindSpeed().doubleValue()
                : 2.0; // m/s
        double windDirection = weather != null && weather.getWindDirection() != null
                ? weather.getWindDirection().doubleValue()
                : 0.0; // degrees
        double temperature = weather != null && weather.getTemperature() != null
                ? weather.getTemperature().doubleValue()
                : 20.0; // °C

        // Convert wind direction to radians and calculate components
        double windDirRadians = Math.toRadians(windDirection);
        double windEffectX = windSpeed * Math.cos(windDirRadians);
        double windEffectY = windSpeed * Math.sin(windDirRadians);

        // Initial concentration based on volume, density, and chemical properties
        double volumeLiters = spill.getVolume() != null ? spill.getVolume().doubleValue() : 1000.0;
        double massKg = volumeLiters * density / 1000.0; // Convert to kg
        double initialConcentration = massKg / 1000.0; // mg/L base concentration

        // Time parameters for dispersion evolution
        double timeHours = 1.0; // Calculate for 1-hour time step
        double timeSeconds = timeHours * 3600.0;

        // Atmospheric stability classification (simplified)
        String stabilityClass = getAtmosphericStability(windSpeed, temperature);
        double[] stabilityParams = getStabilityParameters(stabilityClass);
        double sigmaY0 = stabilityParams[0];
        double sigmaZ0 = stabilityParams[1];

        // Tidal influence factor
        double tideInfluence = calculateTideInfluence(tides);

        // Enhanced Gaussian plume dispersion calculation
        double maxConcentration = 0.0;
        for (int i = 0; i < 100; i++) {
            for (int j = 0; j < 100; j++) {
                // Spatial coordinates relative to source
                double x = (i - 50) * 100; // meters from source (east-west)
                double y = (j - 50) * 100; // meters from source (north-south)

                // Account for wind drift over time
                double effectiveX = x - windEffectX * timeSeconds;
                double effectiveY = y - windEffectY * timeSeconds;

                // Distance from source
                double distance = Math.sqrt(effectiveX * effectiveX + effectiveY * effectiveY);

                if (distance < 1.0)
                    distance = 1.0; // Avoid division by zero

                // Pasquill-Gifford dispersion parameters
                double sigmaY = sigmaY0 * Math.pow(distance / 1000.0, 0.9); // Lateral dispersion
                double sigmaZ = sigmaZ0 * Math.pow(distance / 1000.0, 0.8); // Vertical dispersion

                // Minimum dispersion values
                if (sigmaY < 1.0)
                    sigmaY = 1.0;
                if (sigmaZ < 0.5)
                    sigmaZ = 0.5;

                // Gaussian plume formula for ground-level concentration
                double lateralTerm = Math.exp(-0.5 * Math.pow(effectiveY / sigmaY, 2));
                double verticalTerm = Math.exp(-0.5 * Math.pow(1.5 / sigmaZ, 2)); // Assume 1.5m height

                // Base concentration from Gaussian plume
                double concentration = (initialConcentration / (2 * Math.PI * windSpeed * sigmaY * sigmaZ)) *
                        lateralTerm * verticalTerm;

                // Apply environmental factors

                // 1. Chemical decay/evaporation
                double decayFactor = Math.exp(-decayRate * timeSeconds);
                concentration *= decayFactor;

                // 2. Diffusion enhancement
                double diffusionFactor = 1.0 + (diffusionCoeff * timeSeconds) / 10000.0;
                concentration *= diffusionFactor;

                // 3. Temperature effects (volatility)
                double temperatureFactor = 1.0 + (temperature - 20.0) * 0.02; // 2% per degree
                if (vaporPressure > 1000.0) { // Volatile compounds
                    concentration *= (1.0 / temperatureFactor);
                } else {
                    concentration *= temperatureFactor;
                }

                // 4. Tidal mixing effects (for water bodies)
                concentration *= tideInfluence;

                // 5. Wind speed dilution
                double windDilution = Math.max(0.1, windSpeed / 10.0);
                concentration *= windDilution;

                // Ensure non-negative concentration
                concentration = Math.max(0, concentration);
                maxConcentration = Math.max(maxConcentration, concentration);

                // Apply concentration to grid
                dispersionGrid.setConcentration(i, j, concentration);
            }
        }

        DispersionResult result = new DispersionResult();
        result.setDispersionGrid(dispersionGrid);

        System.out.println("=== Calculation Complete ===");
        System.out.println("Stability Class: " + stabilityClass);
        System.out.println("Tide Influence: " + String.format("%.3f", tideInfluence));
        System.out.println("Max Concentration: " + String.format("%.6f mg/L", maxConcentration));

        return result;
    }

    /**
     * Determine atmospheric stability class based on weather conditions
     */
    private String getAtmosphericStability(double windSpeed, double temperature) {
        if (windSpeed < 2.0) {
            return "E"; // Slightly stable
        } else if (windSpeed < 4.0) {
            return "D"; // Neutral
        } else if (windSpeed > 6.0) {
            return "C"; // Slightly unstable
        } else {
            return "D"; // Neutral (default)
        }
    }

    /**
     * Get stability parameters for Pasquill-Gifford curves
     * Returns [sigmaY0, sigmaZ0] coefficients
     */
    private double[] getStabilityParameters(String stabilityClass) {
        switch (stabilityClass) {
            case "A":
                return new double[] { 0.32, 0.24 }; // Very unstable
            case "B":
                return new double[] { 0.24, 0.20 }; // Unstable
            case "C":
                return new double[] { 0.20, 0.16 }; // Slightly unstable
            case "D":
                return new double[] { 0.16, 0.12 }; // Neutral
            case "E":
                return new double[] { 0.12, 0.08 }; // Slightly stable
            case "F":
                return new double[] { 0.08, 0.06 }; // Stable
            default:
                return new double[] { 0.16, 0.12 }; // Neutral default
        }
    }

    /**
     * Calculate tidal influence on dispersion
     */
    private double calculateTideInfluence(List<TideData> tides) {
        if (tides == null || tides.isEmpty()) {
            return 1.0; // No tidal effect
        }

        // Use most recent tide data
        TideData currentTide = tides.get(0);
        double tideHeight = currentTide.getTideHeight() != null ? currentTide.getTideHeight().doubleValue() : 0.0;

        // Normalize tide effect: higher tides = more mixing = more dilution
        double tideEffect = 0.8 + (tideHeight / 10.0) * 0.4; // Range 0.8 - 1.2
        return Math.max(0.5, Math.min(1.5, tideEffect));
    }

    /**
     * Dispersion calculation result container
     */
    public static class DispersionResult {
        private DispersionGrid dispersionGrid;

        public DispersionGrid getDispersionGrid() {
            return dispersionGrid;
        }

        public void setDispersionGrid(DispersionGrid dispersionGrid) {
            this.dispersionGrid = dispersionGrid;
        }
    }

    /**
     * Grid container for concentration values
     */
    public static class DispersionGrid {
        private double centerLat;
        private double centerLon;
        private double cellSize;
        private int gridSize;
        private double[][] concentrations;

        public DispersionGrid(double centerLat, double centerLon, double cellSize, int gridSize) {
            this.centerLat = centerLat;
            this.centerLon = centerLon;
            this.cellSize = cellSize;
            this.gridSize = gridSize;
            this.concentrations = new double[gridSize][gridSize];
        }

        // Getters and setters
        public double getCenterLat() {
            return centerLat;
        }

        public void setCenterLat(double centerLat) {
            this.centerLat = centerLat;
        }

        public double getCenterLon() {
            return centerLon;
        }

        public void setCenterLon(double centerLon) {
            this.centerLon = centerLon;
        }

        public double getCellSize() {
            return cellSize;
        }

        public void setCellSize(double cellSize) {
            this.cellSize = cellSize;
        }

        public int getGridSize() {
            return gridSize;
        }

        public void setGridSize(int gridSize) {
            this.gridSize = gridSize;
        }

        public double getConcentration(int i, int j) {
            if (i < 0 || i >= gridSize || j < 0 || j >= gridSize) {
                return 0.0;
            }
            return concentrations[i][j];
        }

        public void setConcentration(int i, int j, double value) {
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
                concentrations[i][j] = value;
            }
        }

        public double[][] getConcentrations() {
            return concentrations;
        }

        public void setConcentrations(double[][] concentrations) {
            this.concentrations = concentrations;
        }
    }
}
