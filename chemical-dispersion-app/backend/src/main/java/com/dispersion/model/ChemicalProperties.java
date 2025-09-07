package com.dispersion.model;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chemical_properties")
public class ChemicalProperties {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(nullable = false, length = 100, unique = true)
    private String name;

    @Column(name = "cid")
    private Long cid;

    @Column(name = "molecular_formula", length = 200)
    private String molecularFormula;

    @Column(name = "molecular_weight", precision = 10, scale = 4)
    private BigDecimal molecularWeight;

    @Column(name = "iupac_name", length = 500)
    private String iupacName;

    @Column(name = "smiles", length = 500)
    private String smiles;

    @Column(precision = 8, scale = 4)
    private BigDecimal density;

    @Column(precision = 12, scale = 8)
    private BigDecimal viscosity;

    @Column(precision = 12, scale = 6)
    private BigDecimal solubility;

    @Column(name = "vapor_pressure", precision = 12, scale = 6)
    private BigDecimal vaporPressure;

    @Column(name = "diffusion_coefficient", precision = 12, scale = 8)
    private BigDecimal diffusionCoefficient;

    @Column(name = "decay_rate", precision = 12, scale = 8)
    private BigDecimal decayRate;

    @Column(name = "toxicity_level", length = 20)
    private String toxicityLevel;

    @Column(name = "environmental_fate", columnDefinition = "TEXT")
    private String environmentalFate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // All getters and setters remain the same
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

    public Long getCid() {
        return cid;
    }

    public void setCid(Long cid) {
        this.cid = cid;
    }

    public String getMolecularFormula() {
        return molecularFormula;
    }

    public void setMolecularFormula(String molecularFormula) {
        this.molecularFormula = molecularFormula;
    }

    public BigDecimal getMolecularWeight() {
        return molecularWeight;
    }

    public void setMolecularWeight(BigDecimal molecularWeight) {
        this.molecularWeight = molecularWeight;
    }

    public String getIupacName() {
        return iupacName;
    }

    public void setIupacName(String iupacName) {
        this.iupacName = iupacName;
    }

    public String getSmiles() {
        return smiles;
    }

    public void setSmiles(String smiles) {
        this.smiles = smiles;
    }

    public BigDecimal getDensity() {
        return density;
    }

    public void setDensity(BigDecimal density) {
        this.density = density;
    }

    public BigDecimal getViscosity() {
        return viscosity;
    }

    public void setViscosity(BigDecimal viscosity) {
        this.viscosity = viscosity;
    }

    public BigDecimal getSolubility() {
        return solubility;
    }

    public void setSolubility(BigDecimal solubility) {
        this.solubility = solubility;
    }

    public BigDecimal getVaporPressure() {
        return vaporPressure;
    }

    public void setVaporPressure(BigDecimal vaporPressure) {
        this.vaporPressure = vaporPressure;
    }

    public BigDecimal getDiffusionCoefficient() {
        return diffusionCoefficient;
    }

    public void setDiffusionCoefficient(BigDecimal diffusionCoefficient) {
        this.diffusionCoefficient = diffusionCoefficient;
    }

    public BigDecimal getDecayRate() {
        return decayRate;
    }

    public void setDecayRate(BigDecimal decayRate) {
        this.decayRate = decayRate;
    }

    public String getToxicityLevel() {
        return toxicityLevel;
    }

    public void setToxicityLevel(String toxicityLevel) {
        this.toxicityLevel = toxicityLevel;
    }

    public String getEnvironmentalFate() {
        return environmentalFate;
    }

    public void setEnvironmentalFate(String environmentalFate) {
        this.environmentalFate = environmentalFate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
