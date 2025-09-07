package com.dispersion.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SpillRequest {

    @NotBlank(message = "Spill name is required")
    @Size(max = 100, message = "Name must be less than 100 characters")
    private String name;

    @NotBlank(message = "Chemical type is required")
    @Size(max = 100, message = "Chemical type must be less than 100 characters")
    private String chemicalType;

    @NotNull(message = "Volume is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Volume must be positive")
    @Digits(integer = 10, fraction = 2, message = "Volume must have up to 2 decimal places")
    private BigDecimal volume;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    @Digits(integer = 3, fraction = 7, message = "Latitude must have up to 7 decimal places")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    @Digits(integer = 3, fraction = 7, message = "Longitude must have up to 7 decimal places")
    private BigDecimal longitude;

    @NotNull(message = "Spill time is required")
    private LocalDateTime spillTime;

    @NotNull(message = "Water depth is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Water depth must be positive")
    @Digits(integer = 6, fraction = 2, message = "Water depth must have up to 2 decimal places")
    private BigDecimal waterDepth;

    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;

    @Size(max = 100, message = "Reported by must be less than 100 characters")
    private String reportedBy;

    @Pattern(regexp = "^\\+?[0-9. ()-]{7,25}$", message = "Invalid phone number format")
    @Size(max = 20, message = "Phone number must be less than 20 characters")
    private String contactPhone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must be less than 100 characters")
    private String contactEmail;

    // All getters and setters remain the same
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

    public String getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(String reportedBy) {
        this.reportedBy = reportedBy;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }
}
