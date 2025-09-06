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

// WeatherRepository.java
package com.dispersion.repository;

import com.dispersion.model.WeatherData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeatherRepository extends JpaRepository<WeatherData, UUID> {
    
    @Query("SELECT w FROM WeatherData w WHERE w.latitude = :lat AND w.longitude = :lon " +
           "AND w.timestamp BETWEEN :startTime AND :endTime ORDER BY w.timestamp")
    List<WeatherData> findByLocationAndTimeRange(@Param("lat") BigDecimal latitude,
                                               @Param("lon") BigDecimal longitude,
                                               @Param("startTime") LocalDateTime startTime,
                                               @Param("endTime") LocalDateTime endTime);
    
    @Query("SELECT w FROM WeatherData w WHERE " +
           "SQRT(POWER(111.0 * (w.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (w.longitude - :lon), 2)) <= :radiusKm " +
           "AND w.timestamp = :timestamp ORDER BY " +
           "SQRT(POWER(111.0 * (w.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (w.longitude - :lon), 2)) LIMIT 1")
    Optional<WeatherData> findNearestWeatherData(@Param("lat") BigDecimal latitude,
                                               @Param("lon") BigDecimal longitude,
                                               @Param("timestamp") LocalDateTime timestamp,
                                               @Param("radiusKm") double radiusKm);
    
    List<WeatherData> findByTimestampBetweenOrderByTimestamp(LocalDateTime start, LocalDateTime end);
    
    void deleteByTimestampBefore(LocalDateTime cutoffTime);
}

// TideRepository.java
package com.dispersion.repository;

import com.dispersion.model.TideData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TideRepository extends JpaRepository<TideData, UUID> {
    
    List<TideData> findByStationIdAndTimestampBetweenOrderByTimestamp(
        String stationId, LocalDateTime startTime, LocalDateTime endTime);
    
    List<TideData> findByStationIdOrderByTimestampDesc(String stationId);
    
    Optional<TideData> findTopByStationIdOrderByTimestampDesc(String stationId);
    
    @Query("SELECT t FROM TideData t WHERE " +
           "SQRT(POWER(111.0 * (t.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (t.longitude - :lon), 2)) <= :radiusKm " +
           "AND t.timestamp BETWEEN :startTime AND :endTime ORDER BY " +
           "SQRT(POWER(111.0 * (t.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (t.longitude - :lon), 2)), t.timestamp")
    List<TideData> findNearestTideData(@Param("lat") BigDecimal latitude,
                                     @Param("lon") BigDecimal longitude,
                                     @Param("startTime") LocalDateTime startTime,
                                     @Param("endTime") LocalDateTime endTime,
                                     @Param("radiusKm") double radiusKm);
    
    List<TideData> findByTimestampBetweenOrderByTimestamp(LocalDateTime start, LocalDateTime end);
    
    void deleteByTimestampBefore(LocalDateTime cutoffTime);
}