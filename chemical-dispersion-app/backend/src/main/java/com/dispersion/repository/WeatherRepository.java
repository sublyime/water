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
        List<WeatherData> findByLocationAndTimeRange(
                        @Param("lat") BigDecimal latitude,
                        @Param("lon") BigDecimal longitude,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime);

        @Query("SELECT w FROM WeatherData w WHERE " +
                        "SQRT(POWER(111.0 * (w.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (w.longitude - :lon), 2)) <= :radiusKm "
                        +
                        "AND w.timestamp = :timestamp ORDER BY " +
                        "SQRT(POWER(111.0 * (w.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (w.longitude - :lon), 2))")
        List<WeatherData> findNearestWeatherData(
                        @Param("lat") BigDecimal latitude,
                        @Param("lon") BigDecimal longitude,
                        @Param("timestamp") LocalDateTime timestamp,
                        @Param("radiusKm") double radiusKm,
                        org.springframework.data.domain.Pageable pageable);

        List<WeatherData> findByTimestampBetweenOrderByTimestamp(LocalDateTime start, LocalDateTime end);

        void deleteByTimestampBefore(LocalDateTime cutoffTime);
}