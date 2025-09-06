package com.dispersion.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

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

    public static class ConcentrationPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;
        private BigDecimal concentration;

        // Constructors, getters, and setters
    }

    public static class PlumeContour {
        private String level;
        private List<LatLngPoint> points;

        // Constructors, getters, and setters
    }

    public static class LatLngPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;

        // Constructors, getters, and setters
    }
}