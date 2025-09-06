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
                        "SQRT(POWER(111.0 * (t.latitude - :lat), 2) + POWER(111.0 * COS(RADIANS(:lat)) * (t.longitude - :lon), 2)) <= :radiusKm "
                        +
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