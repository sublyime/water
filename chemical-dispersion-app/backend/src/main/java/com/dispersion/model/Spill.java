package com.dispersion.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "spills")
public class Spill {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotBlank(message = "Spill name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Chemical type is required")
    @Column(name = "chemical_type", nullable = false)
    private String chemicalType;

    @NotNull(message = "Volume is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Volume must be positive")
    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal volume; // in liters

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    @NotNull(message = "Spill time is required")
    @Column(name = "spill_time", nullable = false)
    private LocalDateTime spillTime;

    @Column(name = "water_depth", precision = 8, scale = 2)
    private BigDecimal waterDepth; // in meters

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpillStatus status = SpillStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Spill() {
    }

    public Spill(String name, String chemicalType, BigDecimal volume,
            BigDecimal latitude, BigDecimal longitude, LocalDateTime spillTime) {
        this.name = name;
        this.chemicalType = chemicalType;
        this.volume = volume;
        this.latitude = latitude;
        this.longitude = longitude;
        this.spillTime = spillTime;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

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

    public SpillStatus getStatus() {
        return status;
    }

    public void setStatus(SpillStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public enum SpillStatus {
        ACTIVE, CONTAINED, CLEANED, ARCHIVED
    }
}