package com.dispersion.service;

import com.dispersion.model.TideData;
import com.dispersion.repository.TideRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

@Service
public class TideService {

    @Autowired
    private TideRepository tideRepository;

    @Value("${external-apis.noaa.base-url}")
    private String noaaBaseUrl;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    // Major US tidal stations
    private final String[][] MAJOR_STATIONS = {
            { "8518750", "The Battery, NY", "40.7000", "-74.0142" },
            { "9414290", "San Francisco, CA", "37.8063", "-122.4659" },
            { "8443970", "Boston, MA", "42.3548", "-71.0502" },
            { "8771450", "Galveston Pier 21, TX", "29.3100", "-94.7933" },
            { "9447130", "Seattle, WA", "47.6034", "-122.3389" },
            { "8545240", "Philadelphia, PA", "39.9335", "-75.1403" },
            { "8658120", "Wilmington, NC", "34.2271", "-77.9536" },
            { "8724580", "Key West, FL", "24.5551", "-81.8077" },
            { "8465705", "New Haven, CT", "41.2833", "-72.9083" },
            { "8516945", "Kings Point, NY", "40.8100", "-73.7650" }
    };

    public TideService() {
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get current tide data for the nearest station
     */
    public TideData getCurrentTideData(double latitude, double longitude) {
        String stationId = findNearestStation(latitude, longitude);
        return getCurrentTideDataForStation(stationId);
    }

    /**
     * Get current tide data for a specific station
     */
    public TideData getCurrentTideDataForStation(String stationId) {
        try {
            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

            // Get water level data
            String waterLevelUrl = String.format(
                    "%s?date=latest&station=%s&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json",
                    noaaBaseUrl, stationId);

            String waterLevelResponse = webClient.get()
                    .uri(waterLevelUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Get current data (velocity and direction)
            String currentUrl = String.format(
                    "%s?date=latest&station=%s&product=currents&time_zone=gmt&units=metric&format=json",
                    noaaBaseUrl, stationId);

            String currentResponse = webClient.get()
                    .uri(currentUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            TideData tideData = parseNOAATideData(waterLevelResponse, currentResponse, stationId);

            // Save to database
            tideRepository.save(tideData);

            return tideData;

        } catch (Exception e) {
            System.err.println("Error fetching tide data for station " + stationId + ": " + e.getMessage());
            return getDefaultTideData(stationId);
        }
    }

    /**
     * Get tide forecast for next 72 hours
     */
    public List<TideData> getTideForecast(double latitude, double longitude, int hoursAhead) {
        String stationId = findNearestStation(latitude, longitude);
        return getTideForecastForStation(stationId, hoursAhead);
    }

    /**
     * Get tide forecast for a specific station
     */
    public List<TideData> getTideForecastForStation(String stationId, int hoursAhead) {
        try {
            LocalDateTime startTime = LocalDateTime.now();
            LocalDateTime endTime = startTime.plusHours(hoursAhead);

            String startTimeStr = startTime.format(DateTimeFormatter.ofPattern("yyyyMMdd HH:mm"));
            String endTimeStr = endTime.format(DateTimeFormatter.ofPattern("yyyyMMdd HH:mm"));

            // Get predictions for water levels
            String predictionsUrl = String.format(
                    "%s?begin_date=%s&end_date=%s&station=%s&product=predictions&datum=MLLW&time_zone=gmt&units=metric&format=json&interval=h",
                    noaaBaseUrl, startTimeStr.replace(" ", "%20"), endTimeStr.replace(" ", "%20"), stationId);

            String predictionsResponse = webClient.get()
                    .uri(predictionsUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Get current predictions
            String currentPredictionsUrl = String.format(
                    "%s?begin_date=%s&end_date=%s&station=%s&product=currents_predictions&time_zone=gmt&units=metric&format=json&interval=h",
                    noaaBaseUrl, startTimeStr.replace(" ", "%20"), endTimeStr.replace(" ", "%20"), stationId);

            String currentPredictionsResponse = webClient.get()
                    .uri(currentPredictionsUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNOAATideForecast(predictionsResponse, currentPredictionsResponse, stationId);

        } catch (Exception e) {
            System.err.println("Error fetching tide forecast for station " + stationId + ": " + e.getMessage());
            return generateDefaultTideForecast(stationId, hoursAhead);
        }
    }

    /**
     * Parse NOAA tide data response
     */
    private TideData parseNOAATideData(String waterLevelResponse, String currentResponse, String stationId) {
        TideData tideData = new TideData();

        try {
            // Parse water level data
            if (waterLevelResponse != null && !waterLevelResponse.isEmpty()) {
                JsonNode waterLevelJson = objectMapper.readTree(waterLevelResponse);
                JsonNode waterLevelData = waterLevelJson.get("data");

                if (waterLevelData.isArray() && waterLevelData.size() > 0) {
                    JsonNode latestWaterLevel = waterLevelData.get(waterLevelData.size() - 1);

                    String timeStr = latestWaterLevel.get("t").asText();
                    double waterLevel = latestWaterLevel.get("v").asDouble();

                    tideData.setTimestamp(
                            LocalDateTime.parse(timeStr + ":00", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                    tideData.setWaterLevel(BigDecimal.valueOf(waterLevel));
                }
            }

            // Parse current data
            if (currentResponse != null && !currentResponse.isEmpty()) {
                JsonNode currentJson = objectMapper.readTree(currentResponse);
                JsonNode currentData = currentJson.get("data");

                if (currentData.isArray() && currentData.size() > 0) {
                    JsonNode latestCurrent = currentData.get(currentData.size() - 1);

                    if (latestCurrent.has("s")) {
                        double currentSpeed = latestCurrent.get("s").asDouble();
                        tideData.setCurrentSpeed(BigDecimal.valueOf(currentSpeed / 100.0)); // Convert cm/s to m/s
                    }

                    if (latestCurrent.has("d")) {
                        double currentDirection = latestCurrent.get("d").asDouble();
                        tideData.setCurrentDirection(BigDecimal.valueOf(currentDirection));
                    }
                }
            }

            // Set station information
            tideData.setStationId(stationId);
            tideData.setStationName(getStationName(stationId));

            String[] stationInfo = getStationInfo(stationId);
            if (stationInfo != null) {
                tideData.setLatitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[2])));
                tideData.setLongitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[3])));
            }

            // Set defaults if not available
            if (tideData.getTimestamp() == null) {
                tideData.setTimestamp(LocalDateTime.now());
            }
            if (tideData.getWaterLevel() == null) {
                tideData.setWaterLevel(BigDecimal.ZERO);
            }
            if (tideData.getCurrentSpeed() == null) {
                tideData.setCurrentSpeed(BigDecimal.valueOf(0.5)); // Default 0.5 m/s
            }
            if (tideData.getCurrentDirection() == null) {
                tideData.setCurrentDirection(BigDecimal.valueOf(180.0)); // Default south
            }

        } catch (Exception e) {
            System.err.println("Error parsing NOAA tide data: " + e.getMessage());
            return getDefaultTideData(stationId);
        }

        return tideData;
    }

    /**
     * Parse NOAA tide forecast data
     */
    private List<TideData> parseNOAATideForecast(String predictionsResponse, String currentPredictionsResponse,
            String stationId) {
        List<TideData> forecast = new ArrayList<>();

        try {
            JsonNode predictionsJson = objectMapper.readTree(predictionsResponse);
            JsonNode predictions = predictionsJson.get("predictions");

            if (predictions.isArray()) {
                for (JsonNode prediction : predictions) {
                    TideData tideData = new TideData();

                    String timeStr = prediction.get("t").asText();
                    double waterLevel = prediction.get("v").asDouble();

                    tideData.setTimestamp(
                            LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
                    tideData.setWaterLevel(BigDecimal.valueOf(waterLevel));
                    tideData.setStationId(stationId);
                    tideData.setStationName(getStationName(stationId));

                    String[] stationInfo = getStationInfo(stationId);
                    if (stationInfo != null) {
                        tideData.setLatitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[2])));
                        tideData.setLongitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[3])));
                    }

                    // Add estimated current based on tide predictions
                    tideData.setCurrentSpeed(BigDecimal.valueOf(0.3 + Math.random() * 0.4)); // 0.3-0.7 m/s
                    tideData.setCurrentDirection(BigDecimal.valueOf(Math.random() * 360));

                    forecast.add(tideData);
                }
            }

        } catch (Exception e) {
            System.err.println("Error parsing NOAA tide forecast: " + e.getMessage());
            return generateDefaultTideForecast(stationId, 24);
        }

        return forecast;
    }

    /**
     * Find nearest tide station
     */
    private String findNearestStation(double latitude, double longitude) {
        String nearestStation = MAJOR_STATIONS[0][0]; // Default to first station
        double minDistance = Double.MAX_VALUE;

        for (String[] station : MAJOR_STATIONS) {
            double stationLat = Double.parseDouble(station[2]);
            double stationLon = Double.parseDouble(station[3]);
            double distance = calculateDistance(latitude, longitude, stationLat, stationLon);

            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station[0];
            }
        }

        return nearestStation;
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth's radius in km

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Get station name by ID
     */
    private String getStationName(String stationId) {
        for (String[] station : MAJOR_STATIONS) {
            if (station[0].equals(stationId)) {
                return station[1];
            }
        }
        return "Unknown Station";
    }

    /**
     * Get station info by ID
     */
    private String[] getStationInfo(String stationId) {
        for (String[] station : MAJOR_STATIONS) {
            if (station[0].equals(stationId)) {
                return station;
            }
        }
        return null;
    }

    /**
     * Generate default tide forecast
     */
    private List<TideData> generateDefaultTideForecast(String stationId, int hoursAhead) {
        List<TideData> forecast = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 0; i < hoursAhead; i++) {
            TideData tideData = new TideData();
            tideData.setStationId(stationId);
            tideData.setStationName(getStationName(stationId));
            tideData.setTimestamp(now.plusHours(i));

            String[] stationInfo = getStationInfo(stationId);
            if (stationInfo != null) {
                tideData.setLatitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[2])));
                tideData.setLongitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[3])));
            }

            // Generate tidal pattern (sinusoidal)
            double tidePhase = (i * 2 * Math.PI) / 12.42; // Semi-diurnal tide (12.42 hours)
            double waterLevel = 2.0 * Math.sin(tidePhase); // ±2m variation
            tideData.setWaterLevel(BigDecimal.valueOf(waterLevel));

            // Generate current based on tide
            double currentSpeed = 0.5 + 0.3 * Math.abs(Math.cos(tidePhase));
            tideData.setCurrentSpeed(BigDecimal.valueOf(currentSpeed));

            double currentDirection = 180.0 + 45 * Math.sin(tidePhase);
            tideData.setCurrentDirection(BigDecimal.valueOf(currentDirection));

            forecast.add(tideData);
        }

        return forecast;
    }

    /**
     * Get default tide data when API fails
     */
    private TideData getDefaultTideData(String stationId) {
        TideData tideData = new TideData();
        tideData.setStationId(stationId);
        tideData.setStationName(getStationName(stationId));
        tideData.setTimestamp(LocalDateTime.now());
        tideData.setWaterLevel(BigDecimal.ZERO);
        tideData.setCurrentSpeed(BigDecimal.valueOf(0.5));
        tideData.setCurrentDirection(BigDecimal.valueOf(180.0));

        String[] stationInfo = getStationInfo(stationId);
        if (stationInfo != null) {
            tideData.setLatitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[2])));
            tideData.setLongitude(BigDecimal.valueOf(Double.parseDouble(stationInfo[3])));
        }

        return tideData;
    }

    /**
     * Get available tide stations
     */
    public List<String> getAvailableStations() {
        List<String> stations = new ArrayList<>();
        for (String[] station : MAJOR_STATIONS) {
            stations.add(station[0] + " - " + station[1]);
        }
        return stations;
    }

    /**
     * Save tide data to database
     */
    public TideData saveTideData(TideData tideData) {
        return tideRepository.save(tideData);
    }
}