package com.dispersion.service;

import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import org.apache.commons.math3.analysis.interpolation.BilinearInterpolator;
import org.apache.commons.math3.analysis.interpolation.BilinearInterpolatingFunction;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class FluidDynamicsService {

    // Physical constants
    private static final double GRAVITATIONAL_ACCELERATION = 9.81; // m/s²
    private static final double WATER_DENSITY = 1000.0; // kg/m³
    private static final double KINEMATIC_VISCOSITY = 1.0e-6; // m²/s for water at 20°C
    private static final double CORIOLIS_PARAMETER = 1.0e-4; // s⁻¹ (approximate for mid-latitudes)

    /**
     * Calculate chemical dispersion using advanced fluid dynamics models
     */
    public DispersionResult calculateDispersion(
            double latitude, double longitude, double volume,
            String chemicalType, List<WeatherData> weatherData,
            List<TideData> tideData, int simulationTimeHours) {

        // Initialize dispersion grid
        DispersionGrid grid = initializeGrid(latitude, longitude, 5000); // 5km radius

        // Get chemical properties
        ChemicalProperties chemical = getChemicalProperties(chemicalType);

        // Calculate initial concentration distribution
        grid = setInitialConcentration(grid, volume, chemical);

        // Time stepping for simulation
        int timeSteps = simulationTimeHours * 12; // 5-minute intervals
        double dt = 300.0; // 5 minutes in seconds

        for (int t = 0; t < timeSteps; t++) {
            double currentTime = t * dt;

            // Get environmental conditions at current time
            EnvironmentalConditions conditions = interpolateConditions(
                    weatherData, tideData, currentTime);

            // Apply advection (transport by currents and wind)
            grid = applyAdvection(grid, conditions, dt);

            // Apply diffusion (spreading due to turbulence)
            grid = applyDiffusion(grid, chemical, conditions, dt);

            // Apply chemical decay/degradation
            grid = applyChemicalDecay(grid, chemical, dt);

            // Apply evaporation (for volatile chemicals)
            grid = applyEvaporation(grid, chemical, conditions, dt);
        }

        return new DispersionResult(grid, chemical, simulationTimeHours);
    }

    /**
     * Initialize dispersion computational grid
     */
    private DispersionGrid initializeGrid(double centerLat, double centerLon, double radiusMeters) {
        int gridSize = 100; // 100x100 grid
        double cellSize = (radiusMeters * 2) / gridSize;

        DispersionGrid grid = new DispersionGrid(gridSize, cellSize, centerLat, centerLon);
        return grid;
    }

    /**
     * Set initial concentration distribution (Gaussian plume)
     */
    private DispersionGrid setInitialConcentration(DispersionGrid grid, double volume, ChemicalProperties chemical) {
        int centerX = grid.getGridSize() / 2;
        int centerY = grid.getGridSize() / 2;

        double totalMass = volume * chemical.getDensity(); // kg
        double sigma = grid.getCellSize() * 2; // Initial spreading

        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                double dx = (i - centerX) * grid.getCellSize();
                double dy = (j - centerY) * grid.getCellSize();
                double distance = Math.sqrt(dx * dx + dy * dy);

                // Gaussian distribution
                double concentration = (totalMass / (2 * Math.PI * sigma * sigma)) *
                        Math.exp(-(distance * distance) / (2 * sigma * sigma));

                grid.setConcentration(i, j, concentration);
            }
        }

        return grid;
    }

    /**
     * Apply advection using finite difference method
     */
    private DispersionGrid applyAdvection(DispersionGrid grid, EnvironmentalConditions conditions, double dt) {
        int n = grid.getGridSize();
        double dx = grid.getCellSize();
        double[][] newConc = new double[n][n];

        // Wind-driven surface current (3% of wind speed)
        double windCurrentU = conditions.getWindSpeed() * Math.cos(Math.toRadians(conditions.getWindDirection()))
                * 0.03;
        double windCurrentV = conditions.getWindSpeed() * Math.sin(Math.toRadians(conditions.getWindDirection()))
                * 0.03;

        // Total velocity = tidal current + wind-driven current
        double totalU = conditions.getCurrentSpeed() * Math.cos(Math.toRadians(conditions.getCurrentDirection()))
                + windCurrentU;
        double totalV = conditions.getCurrentSpeed() * Math.sin(Math.toRadians(conditions.getCurrentDirection()))
                + windCurrentV;

        for (int i = 1; i < n - 1; i++) {
            for (int j = 1; j < n - 1; j++) {
                double currentConc = grid.getConcentration(i, j);

                // Upwind finite difference scheme
                double advectionX = 0, advectionY = 0;

                if (totalU > 0) {
                    advectionX = totalU * (currentConc - grid.getConcentration(i - 1, j)) / dx;
                } else {
                    advectionX = totalU * (grid.getConcentration(i + 1, j) - currentConc) / dx;
                }

                if (totalV > 0) {
                    advectionY = totalV * (currentConc - grid.getConcentration(i, j - 1)) / dx;
                } else {
                    advectionY = totalV * (grid.getConcentration(i, j + 1) - currentConc) / dx;
                }

                newConc[i][j] = currentConc - dt * (advectionX + advectionY);
                newConc[i][j] = Math.max(0, newConc[i][j]); // Ensure non-negative
            }
        }

        grid.setConcentrationGrid(newConc);
        return grid;
    }

    /**
     * Apply diffusion using explicit finite difference method
     */
    private DispersionGrid applyDiffusion(DispersionGrid grid, ChemicalProperties chemical,
            EnvironmentalConditions conditions, double dt) {
        int n = grid.getGridSize();
        double dx = grid.getCellSize();
        double[][] newConc = new double[n][n];

        // Calculate turbulent diffusivity based on wind and currents
        double horizontalDiffusivity = calculateHorizontalDiffusivity(conditions);

        // Stability criterion: D*dt/dx² < 0.25
        double diffusionNumber = horizontalDiffusivity * dt / (dx * dx);
        if (diffusionNumber > 0.25) {
            dt = 0.25 * dx * dx / horizontalDiffusivity;
        }

        for (int i = 1; i < n - 1; i++) {
            for (int j = 1; j < n - 1; j++) {
                double currentConc = grid.getConcentration(i, j);

                double laplacian = (grid.getConcentration(i + 1, j) + grid.getConcentration(i - 1, j) +
                        grid.getConcentration(i, j + 1) + grid.getConcentration(i, j - 1) -
                        4 * currentConc) / (dx * dx);

                newConc[i][j] = currentConc + dt * horizontalDiffusivity * laplacian;
                newConc[i][j] = Math.max(0, newConc[i][j]);
            }
        }

        grid.setConcentrationGrid(newConc);
        return grid;
    }

    /**
     * Calculate horizontal turbulent diffusivity
     */
    private double calculateHorizontalDiffusivity(EnvironmentalConditions conditions) {
        // Smagorinsky model for turbulent diffusivity
        double windStress = 0.0013 * conditions.getWindSpeed() * conditions.getWindSpeed();
        double currentShear = conditions.getCurrentSpeed() / 10.0; // Assume 10m depth scale

        // Combination of wind and current effects
        double turbulentEnergy = windStress + currentShear * currentShear;
        return Math.max(1.0, 100.0 * Math.sqrt(turbulentEnergy)); // m²/s
    }

    /**
     * Apply chemical decay/degradation
     */
    private DispersionGrid applyChemicalDecay(DispersionGrid grid, ChemicalProperties chemical, double dt) {
        double decayRate = chemical.getDecayRate(); // 1/s
        double decayFactor = Math.exp(-decayRate * dt);

        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                double currentConc = grid.getConcentration(i, j);
                grid.setConcentration(i, j, currentConc * decayFactor);
            }
        }

        return grid;
    }

    /**
     * Apply evaporation for volatile chemicals
     */
    private DispersionGrid applyEvaporation(DispersionGrid grid, ChemicalProperties chemical,
            EnvironmentalConditions conditions, double dt) {
        if (chemical.getVaporPressure() < 1000)
            return grid; // Skip for non-volatile chemicals

        // Mass transfer coefficient (m/s)
        double windSpeed = Math.max(1.0, conditions.getWindSpeed());
        double massTransferCoeff = 0.2 * Math.pow(windSpeed, 0.78) *
                Math.pow(chemical.getDiffusionCoefficient() / 1e-5, 0.67);

        // Evaporation rate based on vapor pressure and wind
        double evaporationRate = massTransferCoeff * chemical.getVaporPressure() /
                (8.314 * (conditions.getTemperature() + 273.15));

        double evaporationFactor = Math.exp(-evaporationRate * dt / 1000.0); // Scaling factor

        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                double currentConc = grid.getConcentration(i, j);
                grid.setConcentration(i, j, currentConc * evaporationFactor);
            }
        }

        return grid;
    }

    /**
     * Interpolate environmental conditions for given time
     */
    private EnvironmentalConditions interpolateConditions(List<WeatherData> weatherData,
            List<TideData> tideData, double currentTime) {
        // Simple linear interpolation between nearest data points
        WeatherData weather = interpolateWeatherData(weatherData, currentTime);
        TideData tide = interpolateTideData(tideData, currentTime);

        return new EnvironmentalConditions(weather, tide);
    }

    private WeatherData interpolateWeatherData(List<WeatherData> data, double currentTime) {
        // Implementation of temporal interpolation for weather data
        if (data.isEmpty()) {
            return createDefaultWeatherData();
        }

        // For simplicity, return the first available data point
        // In production, implement proper temporal interpolation
        return data.get(0);
    }

    private TideData interpolateTideData(List<TideData> data, double currentTime) {
        if (data.isEmpty()) {
            return createDefaultTideData();
        }
        return data.get(0);
    }

    private WeatherData createDefaultWeatherData() {
        WeatherData weather = new WeatherData();
        weather.setTemperature(BigDecimal.valueOf(15.0));
        weather.setWindSpeed(BigDecimal.valueOf(5.0));
        weather.setWindDirection(BigDecimal.valueOf(270.0));
        weather.setHumidity(BigDecimal.valueOf(70.0));
        weather.setPressure(BigDecimal.valueOf(101325.0));
        return weather;
    }

    private TideData createDefaultTideData() {
        TideData tide = new TideData();
        tide.setCurrentSpeed(BigDecimal.valueOf(0.5));
        tide.setCurrentDirection(BigDecimal.valueOf(180.0));
        tide.setWaterLevel(BigDecimal.valueOf(0.0));
        return tide;
    }

    /**
     * Get chemical properties based on chemical type
     */
    private ChemicalProperties getChemicalProperties(String chemicalType) {
        // Default properties for common chemicals
        Map<String, ChemicalProperties> chemicals = new HashMap<>();

        chemicals.put("CRUDE_OIL", new ChemicalProperties(
                870.0, 0.001, 0.005, 1.0, 0.0000001, 0.0000001));
        chemicals.put("DIESEL", new ChemicalProperties(
                832.0, 0.0024, 0.1, 200.0, 0.0000002, 0.0000002));
        chemicals.put("GASOLINE", new ChemicalProperties(
                719.0, 0.0006, 120.0, 31000.0, 0.0000003, 0.0000005));
        chemicals.put("BENZENE", new ChemicalProperties(
                876.5, 0.00065, 1780.0, 12700.0, 0.0000009, 0.0000003));

        return chemicals.getOrDefault(chemicalType.toUpperCase(),
                chemicals.get("CRUDE_OIL")); // Default to crude oil
    }

    // Inner classes for data structures
    public static class DispersionGrid {
        private final int gridSize;
        private final double cellSize;
        private final double centerLat;
        private final double centerLon;
        private double[][] concentration;

        public DispersionGrid(int gridSize, double cellSize, double centerLat, double centerLon) {
            this.gridSize = gridSize;
            this.cellSize = cellSize;
            this.centerLat = centerLat;
            this.centerLon = centerLon;
            this.concentration = new double[gridSize][gridSize];
        }

        // Getters and setters
        public int getGridSize() {
            return gridSize;
        }

        public double getCellSize() {
            return cellSize;
        }

        public double getCenterLat() {
            return centerLat;
        }

        public double getCenterLon() {
            return centerLon;
        }

        public double getConcentration(int i, int j) {
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
                return concentration[i][j];
            }
            return 0.0;
        }

        public void setConcentration(int i, int j, double value) {
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
                concentration[i][j] = Math.max(0, value);
            }
        }

        public void setConcentrationGrid(double[][] newConc) {
            for (int i = 0; i < gridSize; i++) {
                System.arraycopy(newConc[i], 0, concentration[i], 0, gridSize);
            }
        }

        public double[][] getConcentrationGrid() {
            return concentration;
        }
    }

    public static class ChemicalProperties {
        private final double density; // kg/m³
        private final double viscosity; // Pa·s
        private final double solubility; // mg/L
        private final double vaporPressure; // Pa
        private final double diffusionCoefficient; // m²/s
        private final double decayRate; // 1/s

        public ChemicalProperties(double density, double viscosity, double solubility,
                double vaporPressure, double diffusionCoefficient, double decayRate) {
            this.density = density;
            this.viscosity = viscosity;
            this.solubility = solubility;
            this.vaporPressure = vaporPressure;
            this.diffusionCoefficient = diffusionCoefficient;
            this.decayRate = decayRate;
        }

        // Getters
        public double getDensity() {
            return density;
        }

        public double getViscosity() {
            return viscosity;
        }

        public double getSolubility() {
            return solubility;
        }

        public double getVaporPressure() {
            return vaporPressure;
        }

        public double getDiffusionCoefficient() {
            return diffusionCoefficient;
        }

        public double getDecayRate() {
            return decayRate;
        }
    }

    public static class EnvironmentalConditions {
        private final double temperature;
        private final double windSpeed;
        private final double windDirection;
        private final double currentSpeed;
        private final double currentDirection;
        private final double humidity;
        private final double pressure;

        public EnvironmentalConditions(WeatherData weather, TideData tide) {
            this.temperature = weather.getTemperature().doubleValue();
            this.windSpeed = weather.getWindSpeed().doubleValue();
            this.windDirection = weather.getWindDirection().doubleValue();
            this.currentSpeed = tide.getCurrentSpeed().doubleValue();
            this.currentDirection = tide.getCurrentDirection().doubleValue();
            this.humidity = weather.getHumidity().doubleValue();
            this.pressure = weather.getPressure().doubleValue();
        }

        // Getters
        public double getTemperature() {
            return temperature;
        }

        public double getWindSpeed() {
            return windSpeed;
        }

        public double getWindDirection() {
            return windDirection;
        }

        public double getCurrentSpeed() {
            return currentSpeed;
        }

        public double getCurrentDirection() {
            return currentDirection;
        }

        public double getHumidity() {
            return humidity;
        }

        public double getPressure() {
            return pressure;
        }
    }

    public static class DispersionResult {
        private final DispersionGrid grid;
        private final ChemicalProperties chemical;
        private final int simulationHours;
        private final double maxConcentration;
        private final double totalMass;

        public DispersionResult(DispersionGrid grid, ChemicalProperties chemical, int simulationHours) {
            this.grid = grid;
            this.chemical = chemical;
            this.simulationHours = simulationHours;
            this.maxConcentration = calculateMaxConcentration();
            this.totalMass = calculateTotalMass();
        }

        private double calculateMaxConcentration() {
            double max = 0;
            for (int i = 0; i < grid.getGridSize(); i++) {
                for (int j = 0; j < grid.getGridSize(); j++) {
                    max = Math.max(max, grid.getConcentration(i, j));
                }
            }
            return max;
        }

        private double calculateTotalMass() {
            double total = 0;
            double cellArea = grid.getCellSize() * grid.getCellSize();
            for (int i = 0; i < grid.getGridSize(); i++) {
                for (int j = 0; j < grid.getGridSize(); j++) {
                    total += grid.getConcentration(i, j) * cellArea;
                }
            }
            return total;
        }

        // Getters
        public DispersionGrid getGrid() {
            return grid;
        }

        public ChemicalProperties getChemical() {
            return chemical;
        }

        public int getSimulationHours() {
            return simulationHours;
        }

        public double getMaxConcentration() {
            return maxConcentration;
        }

        public double getTotalMass() {
            return totalMass;
        }
    }
}