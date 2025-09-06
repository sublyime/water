package com.dispersion.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tide_data", uniqueConstraints = @UniqueConstraint(columnNames = { "station_id", "timestamp" }))
public class TideData {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "station_id", nullable = false, length = 20)
    private String stationId;

    @Column(name = "station_name")
    private String stationName;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "water_level", precision = 8, scale = 3)
    private BigDecimal waterLevel; // meters relative to MLLW

    @Column(name = "current_speed", precision = 6, scale = 3)
    private BigDecimal currentSpeed; // m/s

    @Column(name = "current_direction", precision = 5, scale = 2)
    private BigDecimal currentDirection; // degrees

    @Column(name = "tide_type", length = 20)
    @Enumerated(EnumType.STRING)
    private TideType tideType;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors
    public TideData() {
    }

    public TideData(String stationId, BigDecimal latitude, BigDecimal longitude, LocalDateTime timestamp) {
        this.stationId = stationId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public void setStationName(String stationName) {
        this.stationName = stationName;
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public BigDecimal getWaterLevel() {
        return waterLevel;
    }

    public void setWaterLevel(BigDecimal waterLevel) {
        this.waterLevel = waterLevel;
    }

    public BigDecimal getCurrentSpeed() {
        return currentSpeed;
    }

    public void setCurrentSpeed(BigDecimal currentSpeed) {
        this.currentSpeed = currentSpeed;
    }

    public BigDecimal getCurrentDirection() {
        return currentDirection;
    }

    public void setCurrentDirection(BigDecimal currentDirection) {
        this.currentDirection = currentDirection;
    }

    public TideType getTideType() {
        return tideType;
    }

    public void setTideType(TideType tideType) {
        this.tideType = tideType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public enum TideType {
        HIGH, LOW, RISING, FALLING
    }
}