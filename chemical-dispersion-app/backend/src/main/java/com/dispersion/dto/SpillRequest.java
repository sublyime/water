package com.dispersion.dto;

import javax.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class SpillRequest {
    @NotBlank(message = "Name is mandatory")
    private String name;

    private ChemicalType chemicalType; // Assuming you have an enum for ChemicalType

    private BigDecimal volume; // Volume of the spill

    private BigDecimal latitude;

    private BigDecimal longitude;

    private LocalDateTime spillTime;

    private BigDecimal waterDepth;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ChemicalType getChemicalType() {
        return chemicalType;
    }

    public void setChemicalType(ChemicalType chemicalType) {
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
}