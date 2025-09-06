package com.dispersion.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SpillRequest {
    private String name;
    private String chemicalType;
    private BigDecimal volume;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime spillTime;
    private BigDecimal waterDepth;
}