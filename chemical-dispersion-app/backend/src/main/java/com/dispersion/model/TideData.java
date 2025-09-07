package com.dispersion.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tide_data")
public class TideData {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @NotNull
    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    @NotNull
    @Column(name = "tide_height", precision = 6, scale = 3, nullable = false)
    private BigDecimal tideHeight;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "station_id", length = 50)
    private String stationId;

    @Column(name = "station_name", length = 100)
    private String stationName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 20)
    private String datum;

    @Column(name = "prediction_type", length = 20)
    private String predictionType;

    @Column(name = "source", length = 50)
    private String source;

    // All getters and setters remain the same
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public BigDecimal getTideHeight() {
        return tideHeight;
    }

    public void setTideHeight(BigDecimal tideHeight) {
        this.tideHeight = tideHeight;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getDatum() {
        return datum;
    }

    public void setDatum(String datum) {
        this.datum = datum;
    }

    public String getPredictionType() {
        return predictionType;
    }

    public void setPredictionType(String predictionType) {
        this.predictionType = predictionType;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
