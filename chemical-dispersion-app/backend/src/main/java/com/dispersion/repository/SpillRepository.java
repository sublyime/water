package com.dispersion.repository;

import com.dispersion.model.Spill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SpillRepository extends JpaRepository<Spill, UUID> {

       List<Spill> findByStatus(Spill.SpillStatus status);

       List<Spill> findByChemicalType(String chemicalType);

       List<Spill> findBySpillTimeBetween(LocalDateTime startTime, LocalDateTime endTime);

       @Query("SELECT s FROM Spill s WHERE s.latitude BETWEEN :minLat AND :maxLat " +
                     "AND s.longitude BETWEEN :minLon AND :maxLon")
       List<Spill> findSpillsInArea(@Param("minLat") BigDecimal minLat,
                     @Param("maxLat") BigDecimal maxLat,
                     @Param("minLon") BigDecimal minLon,
                     @Param("maxLon") BigDecimal maxLon);

       @Query("SELECT s FROM Spill s WHERE s.status = :status " +
                     "AND s.spillTime >= :since ORDER BY s.spillTime DESC")
       List<Spill> findActiveSpillsSince(@Param("status") Spill.SpillStatus status,
                     @Param("since") LocalDateTime since);
}