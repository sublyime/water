package com.dispersion.service;

import com.dispersion.model.TideData;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TideService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${external-apis.noaa.base-url:https://api.tidesandcurrents.noaa.gov/api/prod/datagetter}")
    private String noaaBaseUrl;

    @Value("${external-apis.noaa.user-agent:water-dispersion-app}")
    private String userAgent;

    public TideService(WebClient.Builder builder, ObjectMapper objectMapper) {
        this.webClient = builder.build();
        this.objectMapper = objectMapper;
    }

    public List<TideData> getTideForecast(double latitude, double longitude, int hours) {
        // This is a placeholder; a real implementation would find the nearest station
        // and fetch data for it.
        // For this example, we use a fixed station ID for Houston (8770475)
        // because the API does not support lat/lon lookups directly.
        String stationId = "8770475";

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime end = now.plusHours(hours);

        try {
            List<TidePoint> tidePoints = getTidePredictions(stationId, now, end, "MLLW");

            return tidePoints.stream()
                    .map(tp -> {
                        TideData td = new TideData();
                        td.setLatitude(tp.latitude);
                        td.setLongitude(tp.longitude);
                        td.setTimestamp(tp.time);
                        td.setTideHeight(BigDecimal.valueOf(tp.valueMeters));
                        td.setStationId(stationId);
                        td.setSource("NOAA");
                        return td;
                    })
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            System.err.println("Error getting tide forecast: " + ex.getMessage());
            return new ArrayList<>();
        }
    }

    private List<TidePoint> getTidePredictions(String stationId,
            LocalDateTime start,
            LocalDateTime end,
            String datum) {
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd HH:mm");
            String url = String.format(
                    "%s?product=predictions&datum=%s&units=metric&time_zone=gmt&application=%s&format=json&station=%s&begin_date=%s&end_date=%s",
                    noaaBaseUrl, datum, userAgent, stationId, start.format(fmt), end.format(fmt));

            String response = webClient.get()
                    .uri(url)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNoaaTideResponse(response);
        } catch (Exception ex) {
            System.err.println("Error fetching tides: " + ex.getMessage());
            return new ArrayList<>();
        }
    }

    private List<TidePoint> parseNoaaTideResponse(String json) {
        List<TidePoint> out = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode predictions = root.get("predictions");
            if (predictions != null && predictions.isArray()) {
                DateTimeFormatter inFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
                for (JsonNode p : predictions) {
                    String t = p.get("t").asText();
                    double v = Double.parseDouble(p.get("v").asText());
                    out.add(new TidePoint(LocalDateTime.parse(t, inFmt), v));
                }
            }
        } catch (Exception ex) {
            System.err.println("Error parsing NOAA tide response: " + ex.getMessage());
        }
        return out;
    }

    public static class TidePoint {
        public final LocalDateTime time;
        public final double valueMeters;
        // Mock latitude/longitude for a fixed station
        public final java.math.BigDecimal latitude = new java.math.BigDecimal("29.7604");
        public final java.math.BigDecimal longitude = new java.math.BigDecimal("-95.3698");

        public TidePoint(LocalDateTime time, double valueMeters) {
            this.time = time;
            this.valueMeters = valueMeters;
        }
    }
}