package com.dispersion.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class DispersionResponse {

    private UUID spillId;
    private int simulationHours;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal maxConcentration;
    private List<ConcentrationPoint> concentrationGrid;
    private List<PlumeContour> plumeContours;
    private BigDecimal affectedAreaKm2;
    private Map<String, Object> metadata;

    // Getters and setters
    public UUID getSpillId() {
        return spillId;
    }

    public void setSpillId(UUID spillId) {
        this.spillId = spillId;
    }

    public int getSimulationHours() {
        return simulationHours;
    }

    public void setSimulationHours(int simulationHours) {
        this.simulationHours = simulationHours;
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

    public BigDecimal getAffectedAreaKm2() {
        return affectedAreaKm2;
    }

    public void setAffectedAreaKm2(BigDecimal affectedAreaKm2) {
        this.affectedAreaKm2 = affectedAreaKm2;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Inner classes
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

    public static class PlumeContour {
        private String concentrationLevel;
        private List<LatLngPoint> points;

        public PlumeContour() {
        }

        public PlumeContour(String concentrationLevel, List<LatLngPoint> points) {
            this.concentrationLevel = concentrationLevel;
            this.points = points;
        }

        public String getConcentrationLevel() {
            return concentrationLevel;
        }

        public void setConcentrationLevel(String concentrationLevel) {
            this.concentrationLevel = concentrationLevel;
        }

        public List<LatLngPoint> getPoints() {
            return points;
        }

        public void setPoints(List<LatLngPoint> points) {
            this.points = points;
        }
    }
}