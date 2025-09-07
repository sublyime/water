package com.dispersion.service;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.dto.SpillRequest;
import com.dispersion.model.Spill;
import com.dispersion.model.TideData;
import com.dispersion.model.WeatherData;
import com.dispersion.repository.SpillRepository;
import com.dispersion.service.FluidDynamicsService.DispersionGrid;
import com.dispersion.service.FluidDynamicsService.DispersionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class DispersionService {

    @Autowired
    private SpillRepository spillRepository;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private TideService tideService;

    @Autowired
    private FluidDynamicsService fluidDynamicsService;

    // List to hold connected clients for real-time updates
    private final List<SseEmitter> clients = new CopyOnWriteArrayList<>();

    // Method to add a new client (SseEmitter)
    public void addClient(SseEmitter emitter) {
        clients.add(emitter);
        emitter.onCompletion(() -> clients.remove(emitter));
        emitter.onTimeout(() -> clients.remove(emitter));
        System.out.println("New SSE client added. Total clients: " + clients.size());
    }

    // Scheduled method to send updates to all clients every 10 seconds
    @Scheduled(fixedRate = 10000)
    public void sendRealTimeUpdates() {
        System.out.println("Attempting to send real-time updates...");
        List<Spill> activeSpills = getActiveSpills(); // Use existing method to get data
        for (SseEmitter client : clients) {
            try {
                client.send(SseEmitter.event().data(activeSpills));
                System.out.println("Update sent to a client.");
            } catch (IOException e) {
                System.err.println("Failed to send update to client: " + e.getMessage());
                // Client likely disconnected, will be removed by onCompletion/onTimeout
            }
        }
    }

    // Existing methods from your previous code
    public Spill createSpill(SpillRequest request) {
        Spill spill = new Spill();
        spill.setName(request.getName());
        spill.setChemicalType(request.getChemicalType());
        spill.setVolume(request.getVolume());
        spill.setLatitude(request.getLatitude());
        spill.setLongitude(request.getLongitude());
        spill.setSpillTime(request.getSpillTime());
        spill.setWaterDepth(request.getWaterDepth());
        spill.setStatus(Spill.SpillStatus.ACTIVE);
        return spillRepository.save(spill);
    }

    public DispersionResponse calculateDispersion(UUID spillId) {
        Spill spill = spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));

        WeatherData weather = weatherService.getCurrentWeather(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue());
        List<TideData> tides = tideService.getTideForecast(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                24);

        DispersionResult result = fluidDynamicsService.calculateDispersion(spill, weather, tides);

        DispersionResponse response = new DispersionResponse();
        response.setSpillId(spillId);
        response.setCalculationTime(LocalDateTime.now());
        response.setDispersionGrid(result.getDispersionGrid());
        response.setAffectedAreaKm2(BigDecimal.valueOf(calculateAffectedArea(result.getDispersionGrid())));
        return response;
    }

    private double calculateAffectedArea(DispersionGrid grid) {
        final double threshold = 0.01;
        int affectedCells = 0;
        for (int i = 0; i < grid.getGridSize(); i++) {
            for (int j = 0; j < grid.getGridSize(); j++) {
                if (grid.getConcentration(i, j) > threshold) {
                    affectedCells++;
                }
            }
        }
        return affectedCells * (grid.getCellSize() / 1000.0) * (grid.getCellSize() / 1000.0);
    }

    public List<DispersionResponse> getCalculationHistory(UUID spillId) {
        return new ArrayList<>();
    }

    public Spill updateSpillStatus(UUID spillId, Spill.SpillStatus status) {
        Spill spill = getSpillById(spillId);
        spill.setStatus(status);
        return spillRepository.save(spill);
    }

    public void deleteSpill(UUID spillId) {
        if (!spillRepository.existsById(spillId)) {
            throw new RuntimeException("Spill not found with id: " + spillId);
        }
        spillRepository.deleteById(spillId);
    }

    public List<Spill> getSpillsInArea(double minLat, double maxLat, double minLon, double maxLon) {
        return spillRepository.findSpillsInArea(
                BigDecimal.valueOf(minLat), BigDecimal.valueOf(maxLat),
                BigDecimal.valueOf(minLon), BigDecimal.valueOf(maxLon));
    }

    public List<Spill> getActiveSpills() {
        return spillRepository.findByStatus(Spill.SpillStatus.ACTIVE);
    }

    public List<Spill> getSpillByIds(List<UUID> ids) {
        return spillRepository.findAllById(ids);
    }

    public Spill getSpillById(UUID spillId) {
        return spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));
    }
}