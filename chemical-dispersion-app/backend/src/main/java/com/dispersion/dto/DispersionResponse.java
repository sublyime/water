package com.dispersion.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor // Added this to generate the no-arg constructor
public class DispersionResponse {

    private UUID spillId;
    private int simulationHours;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal maxConcentration;
    private List concentrationGrid;
    private List plumeContours;
    private BigDecimal affectedAreaKm2;
    private Map metadata;

    @Data
    @AllArgsConstructor
    public static class ConcentrationPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;
        private BigDecimal concentration;
    }

    @Data
    @AllArgsConstructor
    public static class PlumeContour {
        private String level;
        private List points;
    }

    @Data
    @AllArgsConstructor
    public static class LatLngPoint {
        private BigDecimal latitude;
        private BigDecimal longitude;
    }
}
