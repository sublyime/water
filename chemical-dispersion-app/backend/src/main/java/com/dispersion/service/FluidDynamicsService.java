package com.dispersion.service;

import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Simple 2D advection-diffusion helpers for water dispersion.
 * This is intentionally lightweight and deterministic for production use.
 */
@Service
public class FluidDynamicsService {

    /**
     * Steady-state Gaussian-like concentration at (x,y) down-current from a source
     * at (0,0).
     * Units are arbitrary; be consistent (e.g., meters, m^3/s, m/s).
     *
     * @param sourceStrength Q (mass per time), e.g., g/s
     * @param currentU       mean current speed in +x (m/s)
     * @param diffY          lateral eddy diffusivity (m^2/s)
     * @param x              down-current distance (m), must be > 0 for advection
     * @param y              cross-current offset (m)
     * @return concentration (mass / volume), scaled by a nominal depth
     */
    public double concentrationAt(double sourceStrength,
            double currentU,
            double diffY,
            double depth,
            double x,
            double y) {
        if (currentU <= 0 || x <= 0 || depth <= 0 || diffY <= 0) {
            return 0.0;
        }
        // Lateral spread ~ sqrt(2*K_y*x/U)
        double sigmaY = Math.sqrt(2.0 * diffY * x / currentU);
        double norm = sourceStrength / (Math.sqrt(2.0 * Math.PI) * sigmaY * currentU * depth);
        double gy = Math.exp(-(y * y) / (2.0 * sigmaY * sigmaY));
        return norm * gy;
    }

    /**
     * Sample a centerline (y=0) plume along x = [dx, 2dx, ..., n*dx].
     *
     * @param sourceStrength Q
     * @param currentU       U
     * @param diffY          K_y
     * @param depth          water depth
     * @param dx             step (m)
     * @param steps          number of points
     * @return list of (x, C) pairs
     */
    public List<Point> centerlinePlume(double sourceStrength,
            double currentU,
            double diffY,
            double depth,
            double dx,
            int steps) {
        List<Point> out = new ArrayList<>(steps);
        double x = Math.max(dx, 1e-6);
        for (int i = 0; i < steps; i++, x += dx) {
            double c = concentrationAt(sourceStrength, currentU, diffY, depth, x, 0.0);
            out.add(new Point(x, c));
        }
        return out;
    }

    public DispersionResult calculateDispersion(double latitude, double longitude, double volume,
            String chemicalType, List<WeatherData> weatherData,
            List<TideData> tideData, int simulationHours) {
        // Create a simple dispersion grid for demonstration
        DispersionGrid grid = new DispersionGrid(latitude, longitude, 100.0, 50);

        // Simple simulation - you'll want to implement proper fluid dynamics here
        double maxConcentration = 0;
        double totalMass = 0;

        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                double distance = Math.sqrt(Math.pow(i - grid.getGridSize() / 2.0, 2) +
                        Math.pow(j - grid.getGridSize() / 2.0, 2));
                double concentration = volume * Math.exp(-distance / 10.0);
                grid.setConcentration(i, j, concentration);

                if (concentration > maxConcentration) {
                    maxConcentration = concentration;
                }
                totalMass += concentration;
            }
        }

        return new DispersionResult(grid, maxConcentration, totalMass);
    }

    public static class Point {
        public final double x;
        public final double c;

        public Point(double x, double c) {
            this.x = x;
            this.c = c;
        }
    }

    public static class DispersionResult {
        private DispersionGrid grid;
        private double maxConcentration;
        private double totalMass;
        private Object chemical;

        public DispersionResult() {
        }

        public DispersionResult(DispersionGrid grid, double maxConcentration, double totalMass) {
            this.grid = grid;
            this.maxConcentration = maxConcentration;
            this.totalMass = totalMass;
        }

        public DispersionGrid getGrid() {
            return grid;
        }

        public void setGrid(DispersionGrid grid) {
            this.grid = grid;
        }

        public double getMaxConcentration() {
            return maxConcentration;
        }

        public void setMaxConcentration(double maxConcentration) {
            this.maxConcentration = maxConcentration;
        }

        public double getTotalMass() {
            return totalMass;
        }

        public void setTotalMass(double totalMass) {
            this.totalMass = totalMass;
        }

        public Object getChemical() {
            return chemical;
        }

        public void setChemical(Object chemical) {
            this.chemical = chemical;
        }
    }

    public static class DispersionGrid {
        private double centerLat;
        private double centerLon;
        private double cellSize;
        private int gridSize;
        private double[][] concentrations;

        public DispersionGrid() {
        }

        public DispersionGrid(double centerLat, double centerLon, double cellSize, int gridSize) {
            this.centerLat = centerLat;
            this.centerLon = centerLon;
            this.cellSize = cellSize;
            this.gridSize = gridSize;
            this.concentrations = new double[gridSize][gridSize];
        }

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
            return concentrations[i][j];
        }

        public void setConcentration(int i, int j, double value) {
            concentrations[i][j] = value;
        }

        public double[][] getConcentrations() {
            return concentrations;
        }

        public void setConcentrations(double[][] concentrations) {
            this.concentrations = concentrations;
        }
    }
}