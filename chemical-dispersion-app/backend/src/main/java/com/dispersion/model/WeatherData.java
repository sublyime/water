package com.dispersion.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "weather_data")
public class WeatherData {

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
    @Column(nullable = false)
    private LocalDateTime timestamp;

    @NotNull
    @Column(precision = 6, scale = 2, nullable = false)
    private BigDecimal temperature;

    @NotNull
    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal humidity;

    @NotNull
    @Column(name = "wind_speed", precision = 6, scale = 2, nullable = false)
    private BigDecimal windSpeed;

    @NotNull
    @Column(name = "wind_direction", precision = 6, scale = 2, nullable = false)
    private BigDecimal windDirection;

    @NotNull
    @Column(precision = 8, scale = 2, nullable = false)
    private BigDecimal pressure;

    @NotNull
    @Column(precision = 8, scale = 2, nullable = false)
    private BigDecimal visibility;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "weather_condition", length = 50)
    private String weatherCondition;

    @Column(name = "cloud_cover", precision = 5, scale = 2)
    private BigDecimal cloudCover;

    @Column(name = "precipitation", precision = 6, scale = 2)
    private BigDecimal precipitation;

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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public BigDecimal getTemperature() {
        return temperature;
    }

    public void setTemperature(BigDecimal temperature) {
        this.temperature = temperature;
    }

    public BigDecimal getHumidity() {
        return humidity;
    }

    public void setHumidity(BigDecimal humidity) {
        this.humidity = humidity;
    }

    public BigDecimal getWindSpeed() {
        return windSpeed;
    }

    public void setWindSpeed(BigDecimal windSpeed) {
        this.windSpeed = windSpeed;
    }

    public BigDecimal getWindDirection() {
        return windDirection;
    }

    public void setWindDirection(BigDecimal windDirection) {
        this.windDirection = windDirection;
    }

    public BigDecimal getPressure() {
        return pressure;
    }

    public void setPressure(BigDecimal pressure) {
        this.pressure = pressure;
    }

    public BigDecimal getVisibility() {
        return visibility;
    }

    public void setVisibility(BigDecimal visibility) {
        this.visibility = visibility;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(String weatherCondition) {
        this.weatherCondition = weatherCondition;
    }

    public BigDecimal getCloudCover() {
        return cloudCover;
    }

    public void setCloudCover(BigDecimal cloudCover) {
        this.cloudCover = cloudCover;
    }

    public BigDecimal getPrecipitation() {
        return precipitation;
    }

    public void setPrecipitation(BigDecimal precipitation) {
        this.precipitation = precipitation;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
