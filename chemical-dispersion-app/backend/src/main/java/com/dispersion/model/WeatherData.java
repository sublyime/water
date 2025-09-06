package com.dispersion.model;

import javax.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "weather_data")
public class WeatherData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(precision = 10, scale = 2)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 2)
    private BigDecimal longitude;

    // Add other fields as necessary and ensure they have appropriate annotations
    private double windSpeed; // Example field

    private int humidity; // Example field

    // Add other necessary fields and their getters/setters

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

    // Getters and setters for other fields
}