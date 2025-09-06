package com.dispersion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class DispersionResponse {

    private UUID id;
    private UUID spillId;
    private LocalDateTime calculationTime;
    private int simulationTimeHours;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal maxConcentration;
    private BigDecimal affectedAreaKm2;
    private List<ConcentrationPoint> concentrationGrid;
    private List<PlumeContour> plumeContours;
    private Map<String, Object> metadata;

    // Constructors
    public DispersionResponse() {
    }

    public DispersionResponse(UUID spillId, int simulationTimeHours) {
        this.spillId = spillId;
        this.simulationTimeHours = simulationTimeHours;
        this.calculationTime = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSpillId() {
        return spillId;
    }

    public void setSpillId(UUID spillId) {
        this.spillId = spillId;
    }

    public LocalDateTime getCalculationTime() {
        return calculationTime;
    }

    public void setCalculationTime(LocalDateTime calculationTime) {
        this.calculationTime = calculationTime;
    }

    public int getSimulationTimeHours() {
        return simulationTimeHours;
    }

    public void setSimulationTimeHours(int simulationTimeHours) {
        this.simulationTimeHours = simulationTimeHours;
    }

    public BigDecimal getCenterLatitude() {
        return centerLatitude;
    }

    public void setCenterLatitude(BigDecimal centerLatitude) {
        this.centerLatitude = centerLatitude;
    }

    public BigDecimal getCenterLongitude() {
        return centerLongitude;
    }

    public void setCenterLongitude(BigDecimal centerLongitude) {
        this.centerLongitude = centerLongitude;
    }

    public BigDecimal getMaxConcentration() {
        return maxConcentration;
    }

    public void setMaxConcentration(BigDecimal maxConcentration) {
        this.maxConcentration = maxConcentration;
    }

    public BigDecimal getAffectedAreaKm2() {
        return affectedAreaKm2;
    }

    public void setAffectedAreaKm2(BigDecimal affectedAreaKm2) {
        this.affectedAreaKm2 = affectedAreaKm2;
    }

    public List<ConcentrationPoint> getConcentrationGrid() {
        return concentrationGrid;
    }

    public void setConcentrationGrid(List<ConcentrationPoint> concentrationGrid) {
        this.concentrationGrid = concentrationGrid;
    }

    public List<PlumeContour> getPlumeContours() {
        return plumeContours;
    }

    public void setPlumeContours(List<PlumeContour> plumeContours) {
        this.plumeContours = plumeContours;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Inner classes for structured data
    public static class ConcentrationPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;
        private BigDecimal concentration;

        public ConcentrationPoint() {
        }

        public ConcentrationPoint(BigDecimal latitude, BigDecimal longitude, BigDecimal concentration) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.concentration = concentration;
        }

        public BigDecimal getLatitude() {
            return latitude;
        }

        public void setLatitude(BigDecimal latitude) {
            this.latitude = latitude;
        }

        public BigDecimal getLongitude() {
            return longitude;
        }

        public void setLongitude(BigDecimal longitude) {
            this.longitude = longitude;
        }

        public BigDecimal getConcentration() {
            return concentration;
        }

        public void setConcentration(BigDecimal concentration) {
            this.concentration = concentration;
        }
    }

    public static class PlumeContour {
        private String concentrationLevel; // e.g., "1ppm", "10ppm", "100ppm"
        private List<LatLngPoint> coordinates;

        public PlumeContour() {
        }

        public PlumeContour(String concentrationLevel, List<LatLngPoint> coordinates) {
            this.concentrationLevel = concentrationLevel;
            this.coordinates = coordinates;
        }

        public String getConcentrationLevel() {
            return concentrationLevel;
        }

        public void setConcentrationLevel(String concentrationLevel) {
            this.concentrationLevel = concentrationLevel;
        }

        public List<LatLngPoint> getCoordinates() {
            return coordinates;
        }

        public void setCoordinates(List<LatLngPoint> coordinates) {
            this.coordinates = coordinates;
        }
    }

    public static class LatLngPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;

        public LatLngPoint() {
        }

        public LatLngPoint(BigDecimal latitude, BigDecimal longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public BigDecimal getLatitude() {
            return latitude;
        }

        public void setLatitude(BigDecimal latitude) {
            this.latitude = latitude;
        }

        public BigDecimal getLongitude() {
            return longitude;
        }

        public void setLongitude(BigDecimal longitude) {
            this.longitude = longitude;
        }
    }
}