package com.dispersion.service;

import com.dispersion.model.Spill;
import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class FluidDynamicsService {

    public double concentrationAt(double sourceStrength,
            double currentU,
            double diffY,
            double depth,
            double x,
            double y) {
        if (currentU <= 0 || depth <= 0 || diffY <= 0) {
            return 0.0;
        }

        // Avoid division by zero for x <= 0
        if (x <= 0) {
            return 0.0;
        }

        double sigmaY = Math.sqrt(2.0 * diffY * x / currentU);
        double norm = sourceStrength / (Math.sqrt(2.0 * Math.PI) * sigmaY * currentU * depth);
        double gy = Math.exp(-(y * y) / (2.0 * sigmaY * sigmaY));
        return norm * gy;
    }

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

    public DispersionResult calculateDispersion(Spill spill, WeatherData weather, List<TideData> tides) {
        // Simple implementation - could be enhanced with more sophisticated physics
        double sourceStrength = spill.getVolume().doubleValue();
        double currentU = weather.getWindSpeed().doubleValue() * 0.05; // Simplified conversion
        double diffY = 1.0; // Turbulent diffusion coefficient
        double depth = spill.getWaterDepth().doubleValue();

        int gridSize = 100;
        double cellSize = 100.0; // meters

        DispersionGrid grid = new DispersionGrid(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                cellSize,
                gridSize);

        double centerX = grid.getGridSize() / 2.0;
        double centerY = grid.getGridSize() / 2.0;

        for (int i = 0; i < gridSize; i++) {
            for (int j = 0; j < gridSize; j++) {
                double x = (i - centerX) * cellSize;
                double y = (j - centerY) * cellSize;

                // Use absolute x value for concentration calculation
                double concentration = concentrationAt(sourceStrength, currentU, diffY, depth, Math.abs(x), y);
                grid.setConcentration(i, j, concentration);
            }
        }

        DispersionResult result = new DispersionResult();
        result.setDispersionGrid(grid);
        return result;
    }

    public static class Point {
        public final double x;
        public final double y;

        public Point(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }

    public static class DispersionResult {
        private DispersionGrid dispersionGrid;

        public DispersionGrid getDispersionGrid() {
            return dispersionGrid;
        }

        public void setDispersionGrid(DispersionGrid dispersionGrid) {
            this.dispersionGrid = dispersionGrid;
        }
    }

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