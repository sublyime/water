package com.dispersion.model;

import javax.persistence.*;
import javax.validation.constraints.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "spills")
public class Spill {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Spill name is required")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "Chemical type is required")
    @Column(name = "chemical_type", nullable = false, length = 100)
    private String chemicalType;

    @NotNull(message = "Volume is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Volume must be positive")
    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal volume;

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

    @NotNull(message = "Water depth is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Water depth must be positive")
    @Column(name = "water_depth", precision = 8, scale = 2, nullable = false)
    private BigDecimal waterDepth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpillStatus status = SpillStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "cleanup_completed_at")
    private LocalDateTime cleanupCompletedAt;

    @Column(length = 500)
    private String description;

    @Column(name = "reported_by", length = 100)
    private String reportedBy;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    public enum SpillStatus {
        ACTIVE, CONTAINED, CLEANED_UP, MONITORING, ARCHIVED
    }

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

    public LocalDateTime getCleanupCompletedAt() {
        return cleanupCompletedAt;
    }

    public void setCleanupCompletedAt(LocalDateTime cleanupCompletedAt) {
        this.cleanupCompletedAt = cleanupCompletedAt;
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