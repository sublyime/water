package com.dispersion.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SpillRequest {

    @NotBlank(message = "Spill name is required")
    private String name;

    @NotBlank(message = "Chemical type is required")
    private String chemicalType;

    @NotNull(message = "Volume is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Volume must be positive")
    private BigDecimal volume; // in liters

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;

    @NotNull(message = "Spill time is required")
    private LocalDateTime spillTime;

    private BigDecimal waterDepth; // in meters (optional)

    private String description; // Optional description

    // Constructors
    public SpillRequest() {
    }

    public SpillRequest(String name, String chemicalType, BigDecimal volume,
            BigDecimal latitude, BigDecimal longitude, LocalDateTime spillTime) {
        this.name = name;
        this.chemicalType = chemicalType;
        this.volume = volume;
        this.latitude = latitude;
        this.longitude = longitude;
        this.spillTime = spillTime;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getChemicalType() {
        return chemicalType;
    }

    public void setChemicalType(String chemicalType) {
        this.chemicalType = chemicalType;
    }

    public BigDecimal getVolume() {
        return volume;
    }

    public void setVolume(BigDecimal volume) {
        this.volume = volume;
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

    public LocalDateTime getSpillTime() {
        return spillTime;
    }

    public void setSpillTime(LocalDateTime spillTime) {
        this.spillTime = spillTime;
    }

    public BigDecimal getWaterDepth() {
        return waterDepth;
    }

    public void setWaterDepth(BigDecimal waterDepth) {
        this.waterDepth = waterDepth;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}