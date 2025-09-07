package com.dispersion.service;

import com.dispersion.dto.DispersionResponse;
import com.dispersion.dto.SpillRequest;
import com.dispersion.model.Spill;
import com.dispersion.model.TideData;
import com.dispersion.model.WeatherData;
import com.dispersion.model.ChemicalProperties;
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
    private ChemicalService chemicalService;

    @Autowired
    private FluidDynamicsService fluidDynamicsService;

    private final List<SseEmitter> clients = new CopyOnWriteArrayList<>();

    public void addClient(SseEmitter emitter) {
        clients.add(emitter);
        emitter.onCompletion(() -> clients.remove(emitter));
        emitter.onTimeout(() -> clients.remove(emitter));
        System.out.println("New SSE client added. Total clients: " + clients.size());
    }

    @Scheduled(fixedRate = 60000) // Every minute
    public void sendRealTimeUpdates() {
        System.out.println("Sending real-time updates...");
        List<Spill> activeSpills = getActiveSpills();

        // Recalculate dispersion for all active spills
        for (Spill spill : activeSpills) {
            try {
                calculateDispersion(spill.getId());
            } catch (Exception e) {
                System.err.println("Error updating dispersion for spill " + spill.getId() + ": " + e.getMessage());
            }
        }

        for (SseEmitter client : clients) {
            try {
                client.send(SseEmitter.event().data(activeSpills));
                System.out.println("Update sent to client.");
            } catch (IOException e) {
                System.err.println("Failed to send update to client: " + e.getMessage());
            }
        }
    }

    public Spill createSpill(SpillRequest request) {
        Spill spill = new Spill();
        spill.setName(request.getName());
        spill.setChemicalType(request.getChemicalType());
        spill.setVolume(request.getVolume());
        spill.setLatitude(request.getLatitude());
        spill.setLongitude(request.getLongitude());
        spill.setSpillTime(request.getSpillTime() != null ? request.getSpillTime() : LocalDateTime.now());
        spill.setWaterDepth(request.getWaterDepth());
        spill.setStatus(Spill.SpillStatus.ACTIVE);
        spill.setDescription(request.getDescription());
        spill.setReportedBy(request.getReportedBy());
        spill.setContactPhone(request.getContactPhone());
        spill.setContactEmail(request.getContactEmail());

        // Get or fetch chemical properties
        try {
            ChemicalProperties chemicalProps = chemicalService.getOrFetchChemicalProperties(request.getChemicalType());
            System.out.println("Chemical properties loaded for: " + chemicalProps.getName());
        } catch (Exception e) {
            System.err.println("Error loading chemical properties: " + e.getMessage());
        }

        return spillRepository.save(spill);
    }

    public DispersionResponse calculateDispersion(UUID spillId) {
        Spill spill = spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));

        // Get current weather data
        WeatherData weather = weatherService.getCurrentWeather(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue());

        // Get tide forecast
        List<TideData> tides = tideService.getTideForecast(
                spill.getLatitude().doubleValue(),
                spill.getLongitude().doubleValue(),
                24);

        // Get chemical properties
        ChemicalProperties chemical = chemicalService.getOrFetchChemicalProperties(spill.getChemicalType());

        // Calculate dispersion
        DispersionResult result = fluidDynamicsService.calculateDispersion(spill, weather, tides, chemical);

        DispersionResponse response = new DispersionResponse();
        response.setSpillId(spillId);
        response.setCalculationTime(LocalDateTime.now());
        response.setDispersionGrid(result.getDispersionGrid());
        response.setAffectedAreaKm2(BigDecimal.valueOf(calculateAffectedArea(result.getDispersionGrid())));
        response.setStatus("COMPLETED");

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
        // Return empty list for now - would implement with calculation results table
        return new ArrayList<>();
    }

    public Spill updateSpillStatus(UUID spillId, Spill.SpillStatus status) {
        Spill spill = getSpillById(spillId);
        spill.setStatus(status);
        if (status == Spill.SpillStatus.CLEANED_UP) {
            spill.setCleanupCompletedAt(LocalDateTime.now());
        }
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

    public List<Spill> getAllSpills() {
        return spillRepository.findAll();
    }

    public List<Spill> getSpillByIds(List<UUID> ids) {
        return spillRepository.findAllById(ids);
    }

    public Spill getSpillById(UUID spillId) {
        return spillRepository.findById(spillId)
                .orElseThrow(() -> new RuntimeException("Spill not found with id: " + spillId));
    }
}
