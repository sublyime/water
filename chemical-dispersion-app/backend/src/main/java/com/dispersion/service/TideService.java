package com.dispersion.service;

import com.dispersion.model.TideData;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

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
        try {
            // For now, return empty list or implement actual tide forecast logic
            // You might need to convert lat/lon to a station ID first
            return new ArrayList<>();
        } catch (Exception ex) {
            System.err.println("Error getting tide forecast: " + ex.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Fetch tide predictions from NOAA CO-OPS.
     *
     * @param stationId e.g., "8771341"
     * @param start     inclusive
     * @param end       inclusive
     * @param datum     e.g., "MLLW" or "NAVD"
     * @return list of [timestamp, valueMeters]
     */
    public List<TidePoint> getTidePredictions(String stationId,
            LocalDateTime start,
            LocalDateTime end,
            String datum) {
        try {
            // NOAA expects times as YYYYMMDD HH:mm
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd HH:mm");
            String beginStr = start.format(fmt);
            String endStr = end.format(fmt);

            String url = String.format(
                    "%s?product=predictions&application=water-dispersion&begin_date=%s&end_date=%s&datum=%s&station=%s&time_zone=gmt&interval=h&units=metric&format=json",
                    noaaBaseUrl,
                    beginStr.replace(" ", "%20"),
                    endStr.replace(" ", "%20"),
                    datum,
                    stationId);

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
                    String t = p.get("t").asText(); // "yyyy-MM-dd HH:mm"
                    double v = Double.parseDouble(p.get("v").asText()); // meters (units=metric)
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

        public TidePoint(LocalDateTime time, double valueMeters) {
            this.time = time;
            this.valueMeters = valueMeters;
        }
    }
}
