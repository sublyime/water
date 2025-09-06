package com.dispersion.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "weather_data", uniqueConstraints = @UniqueConstraint(columnNames = { "latitude", "longitude",
        "timestamp" }))
public class WeatherData {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7, nullable = false)
    private BigDecimal longitude;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature; // Celsius

    @Column(precision = 5, scale = 2)
    private BigDecimal humidity; // Percentage

    @Column(precision = 8, scale = 2)
    private BigDecimal pressure; // Pascals

    @Column(name = "wind_speed", precision = 6, scale = 2)
    private BigDecimal windSpeed; // m/s

    @Column(name = "wind_direction", precision = 5, scale = 2)
    private BigDecimal windDirection; // degrees

    @Column(name = "wind_gust", precision = 6, scale = 2)
    private BigDecimal windGust; // m/s

    @Column(precision = 8, scale = 2)
    private BigDecimal visibility; // meters

    @Column(name = "cloud_cover", precision = 5, scale = 2)
    private BigDecimal cloudCover; // percentage

    @Column(precision = 6, scale = 2)
    private BigDecimal precipitation; // mm

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public WeatherData() {
    }

    public WeatherData(BigDecimal latitude, BigDecimal longitude, LocalDateTime timestamp) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    // Setters (added for all fields mentioned in errors)
    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public void setTemperature(BigDecimal temperature) {
        this.temperature = temperature;
    }

    public void setHumidity(BigDecimal humidity) {
        this.humidity = humidity;
    }

    public void setPressure(BigDecimal pressure) {
        this.pressure = pressure;
    }

    public void setWindSpeed(BigDecimal windSpeed) {
        this.windSpeed = windSpeed;
    }

    public void setWindDirection(BigDecimal windDirection) {
        this.windDirection = windDirection;
    }

    public void setVisibility(BigDecimal visibility) {
        this.visibility = visibility;
    }

    // Getters (added for completeness; add others as needed)
    public UUID getId() {
        return id;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public BigDecimal getTemperature() {
        return temperature;
    }

    public BigDecimal getHumidity() {
        return humidity;
    }

    public BigDecimal getPressure() {
        return pressure;
    }

    public BigDecimal getWindSpeed() {
        return windSpeed;
    }

    public BigDecimal getWindDirection() {
        return windDirection;
    }

    public BigDecimal getWindGust() {
        return windGust;
    }

    public BigDecimal getVisibility() {
        return visibility;
    }

    public BigDecimal getCloudCover() {
        return cloudCover;
    }

    public BigDecimal getPrecipitation() {
        return precipitation;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // Add setters for remaining fields if needed (e.g., windGust, cloudCover,
    // precipitation)
    public void setWindGust(BigDecimal windGust) {
        this.windGust = windGust;
    }

    public void setCloudCover(BigDecimal cloudCover) {
        this.cloudCover = cloudCover;
    }

    public void setPrecipitation(BigDecimal precipitation) {
        this.precipitation = precipitation;
    }
}
