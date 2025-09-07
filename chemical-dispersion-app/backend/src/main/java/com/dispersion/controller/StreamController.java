package com.dispersion.controller;

import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/real-time-updates")
public class StreamController {

    private final DispersionService dispersionService;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public StreamController(DispersionService dispersionService, ObjectMapper objectMapper) {
        this.dispersionService = dispersionService;
        this.objectMapper = objectMapper;
    }

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUpdates() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // Schedule a task to periodically send updates
        scheduler.scheduleAtFixedRate(() -> {
            try {
                // Get the list of active spills and convert to JSON
                String jsonUpdates = convertSpillsToJson(dispersionService.getActiveSpills());
                emitter.send(SseEmitter.event().data(jsonUpdates));
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
        }, 0, 5, TimeUnit.SECONDS);

        emitter.onCompletion(() -> scheduler.shutdown());
        emitter.onTimeout(() -> emitter.complete());

        return emitter;
    }

    private String convertSpillsToJson(List<Spill> spills) throws IOException {
        // Use ObjectMapper to convert the list of spills to a JSON string
        return objectMapper.writeValueAsString(spills);
    }
}