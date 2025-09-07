package com.dispersion.service;

import com.dispersion.model.Spill;
import com.dispersion.model.WeatherData;
import com.dispersion.model.TideData;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class FluidDynamicsService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public FluidDynamicsService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://pubchem.ncbi.nlm.nih.gov/rest/pug").build();
        this.objectMapper = objectMapper;
    }

    public DispersionResult calculateDispersion(Spill spill, WeatherData weather, List<TideData> tides) {
        System.out.println("Calculating dispersion for spill: " + spill.getName());
        System.out.println("Weather data: " + weather.getTemperature() + "C, " + weather.getWindSpeed() + "m/s");
        System.out.println("Tide data points: " + tides.size());

        // Get chemical properties from PubChem
        Optional<ChemicalProperties> properties = getChemicalProperties(spill.getChemicalType());

        if (properties.isEmpty()) {
            System.err
                    .println("Could not get chemical properties for " + spill.getChemicalType() + ". Using defaults.");
            // Use default values if API call fails
            // This prevents the application from breaking when a chemical is not found.
        }

        // Mock calculation for demonstration
        DispersionGrid dispersionGrid = new DispersionGrid(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                100,
                100);

        // Simple diffusion model
        double initialConcentration = spill.getVolume().doubleValue() / 1000.0;
        double windEffectX = weather.getWindSpeed().doubleValue()
                * Math.cos(Math.toRadians(weather.getWindDirection().doubleValue()));
        double windEffectY = weather.getWindSpeed().doubleValue()
                * Math.sin(Math.toRadians(weather.getWindDirection().doubleValue()));

        for (int i = 0; i < 100; i++) {
            for (int j = 0; j < 100; j++) {
                double distanceSq = Math.pow(i - 50 - windEffectX, 2) + Math.pow(j - 50 - windEffectY, 2);
                double concentration = initialConcentration * Math.exp(-distanceSq / (2 * 50 * 50));
                dispersionGrid.setConcentration(i, j, concentration);
            }
        }

        DispersionResult result = new DispersionResult();
        result.setDispersionGrid(dispersionGrid);
        return result;
    }

    public Optional<ChemicalProperties> getChemicalProperties(String chemicalName) {
        try {
            String url = String.format("/compound/name/%s/JSON", chemicalName);
            JsonNode root = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            // Assuming we get a single compound result, parse the CID
            JsonNode compound = root.at("/PC_Compounds/0");
            if (compound.isMissingNode()) {
                System.out.println("No compound found for: " + chemicalName);
                return Optional.empty();
            }

            JsonNode cidNode = compound.at("/CID");
            if (cidNode.isMissingNode()) {
                System.out.println("No CID found for compound: " + chemicalName);
                return Optional.empty();
            }

            System.out.println("Found CID for " + chemicalName + ": " + cidNode.asLong());

            ChemicalProperties props = new ChemicalProperties();
            props.setName(chemicalName);
            props.setPubChemCid(cidNode.asLong());

            return Optional.of(props);

        } catch (Exception e) {
            System.err.println("Error fetching chemical properties for " + chemicalName + ": " + e.getMessage());
            return Optional.empty();
        }
    }

    public static class ChemicalProperties {
        private String name;
        private long pubChemCid;
        // Add more properties as needed

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public long getPubChemCid() {
            return pubChemCid;
        }

        public void setPubChemCid(long pubChemCid) {
            this.pubChemCid = pubChemCid;
        }
    }

    public static class DispersionResult {
        private DispersionGrid dispersionGrid;

        public DispersionGrid getDispersionGrid() {
            return dispersionGrid;
        }

        public void setDispersionGrid(DispersionGrid dispersionGrid) {
            this.dispersionGrid = dispersionGrid;
        }
    }

    public static class DispersionGrid {
        private double centerLat;
        private double centerLon;
        private double cellSize;
        private int gridSize;
        private double[][] concentrations;

        public DispersionGrid(double centerLat, double centerLon, double cellSize, int gridSize) {
            this.centerLat = centerLat;
            this.centerLon = centerLon;
            this.cellSize = cellSize;
            this.gridSize = gridSize;
            this.concentrations = new double[gridSize][gridSize];
        }

        public double getCenterLat() {
            return centerLat;
        }

        public void setCenterLat(double centerLat) {
            this.centerLat = centerLat;
        }

        public double getCenterLon() {
            return centerLon;
        }

        public void setCenterLon(double centerLon) {
            this.centerLon = centerLon;
        }

        public double getCellSize() {
            return cellSize;
        }

        public void setCellSize(double cellSize) {
            this.cellSize = cellSize;
        }

        public int getGridSize() {
            return gridSize;
        }

        public void setGridSize(int gridSize) {
            this.gridSize = gridSize;
        }

        public double getConcentration(int i, int j) {
            if (i < 0 || i >= gridSize || j < 0 || j >= gridSize) {
                return 0.0;
            }
            return concentrations[i][j];
        }

        public void setConcentration(int i, int j, double value) {
            if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
                concentrations[i][j] = value;
            }
        }

        public double[][] getConcentrations() {
            return concentrations;
        }

        public void setConcentrations(double[][] concentrations) {
            this.concentrations = concentrations;
        }
    }
}