package com.dispersion.dto;

import com.dispersion.service.FluidDynamicsService.DispersionGrid;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DispersionResponse {

    private UUID spillId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime calculationTime;

    private DispersionGrid dispersionGrid;

    private BigDecimal affectedAreaKm2;

    private List<ConcentrationPoint> concentrationPoints;

    private List<PlumeContour> plumeContours;

    private Double maxConcentration;

    private String status;

    // Default constructor
    public DispersionResponse() {
    }

    // Constructor with essential fields
    public DispersionResponse(UUID spillId, LocalDateTime calculationTime) {
        this.spillId = spillId;
        this.calculationTime = calculationTime;
    }

    // Getters and Setters
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

    public DispersionGrid getDispersionGrid() {
        return dispersionGrid;
    }

    public void setDispersionGrid(DispersionGrid dispersionGrid) {
        this.dispersionGrid = dispersionGrid;
    }

    public BigDecimal getAffectedAreaKm2() {
        return affectedAreaKm2;
    }

    public void setAffectedAreaKm2(BigDecimal affectedAreaKm2) {
        this.affectedAreaKm2 = affectedAreaKm2;
    }

    public List<ConcentrationPoint> getConcentrationPoints() {
        return concentrationPoints;
    }

    public void setConcentrationPoints(List<ConcentrationPoint> concentrationPoints) {
        this.concentrationPoints = concentrationPoints;
    }

    public List<PlumeContour> getPlumeContours() {
        return plumeContours;
    }

    public void setPlumeContours(List<PlumeContour> plumeContours) {
        this.plumeContours = plumeContours;
    }

    public Double getMaxConcentration() {
        return maxConcentration;
    }

    public void setMaxConcentration(Double maxConcentration) {
        this.maxConcentration = maxConcentration;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // Inner classes for additional data structures
    public static class ConcentrationPoint {
        private double latitude;
        private double longitude;
        private double concentration;

        public ConcentrationPoint() {
        }

        public ConcentrationPoint(double latitude, double longitude, double concentration) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.concentration = concentration;
        }

        public double getLatitude() {
            return latitude;
        }

        public void setLatitude(double latitude) {
            this.latitude = latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        public void setLongitude(double longitude) {
            this.longitude = longitude;
        }

        public double getConcentration() {
            return concentration;
        }

        public void setConcentration(double concentration) {
            this.concentration = concentration;
        }
    }

    public static class PlumeContour {
        private double concentrationLevel;
        private List<LatLngPoint> contourPoints;

        public PlumeContour() {
        }

        public PlumeContour(double concentrationLevel, List<LatLngPoint> contourPoints) {
            this.concentrationLevel = concentrationLevel;
            this.contourPoints = contourPoints;
        }

        public double getConcentrationLevel() {
            return concentrationLevel;
        }

        public void setConcentrationLevel(double concentrationLevel) {
            this.concentrationLevel = concentrationLevel;
        }

        public List<LatLngPoint> getContourPoints() {
            return contourPoints;
        }

        public void setContourPoints(List<LatLngPoint> contourPoints) {
            this.contourPoints = contourPoints;
        }
    }

    public static class LatLngPoint {
        private double latitude;
        private double longitude;

        public LatLngPoint() {
        }

        public LatLngPoint(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public double getLatitude() {
            return latitude;
        }

        public void setLatitude(double latitude) {
            this.latitude = latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        public void setLongitude(double longitude) {
            this.longitude = longitude;
        }
    }

    @Override
    public String toString() {
        return "DispersionResponse{" +
                "spillId=" + spillId +
                ", calculationTime=" + calculationTime +
                ", affectedAreaKm2=" + affectedAreaKm2 +
                ", maxConcentration=" + maxConcentration +
                ", status='" + status + '\'' +
                '}';
    }
}