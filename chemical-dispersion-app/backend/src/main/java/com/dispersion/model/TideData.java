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

    @Enumerated(EnumType.STRING)
    @Column(name = "tide_type", length = 20)
    private TideType tideType;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public TideData() {
    }

    public TideData(String stationId, BigDecimal latitude, BigDecimal longitude, LocalDateTime timestamp) {
        this.stationId = stationId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    // Getters and Setters (omitted for brevity, same as original)

    public enum TideType {
        HIGH, LOW, RISING, FALLING
    }
}
