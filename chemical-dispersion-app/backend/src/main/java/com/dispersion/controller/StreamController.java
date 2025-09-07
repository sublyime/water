package com.dispersion.controller;

import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/real-time-updates")
@CrossOrigin(origins = "*")
public class StreamController {

    @Autowired
    private DispersionService dispersionService;

    @Autowired
    private ObjectMapper objectMapper;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUpdates() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        try {
            System.out.println("New SSE client connected");

            // Send initial data
            List<Spill> activeSpills = dispersionService.getActiveSpills();
            String jsonData = objectMapper.writeValueAsString(activeSpills);
            emitter.send(SseEmitter.event().data(jsonData).name("initial"));

            // Add emitter to list for future updates
            emitters.add(emitter);

            // Handle client disconnect
            emitter.onCompletion(() -> {
                System.out.println("SSE client disconnected");
                emitters.remove(emitter);
            });

            emitter.onTimeout(() -> {
                System.out.println("SSE client timeout");
                emitters.remove(emitter);
            });

            emitter.onError((ex) -> {
                System.err.println("SSE client error: " + ex.getMessage());
                emitters.remove(emitter);
            });

        } catch (Exception e) {
            System.err.println("Error setting up SSE: " + e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @GetMapping("/health")
    public String healthCheck() {
        return "SSE service is running. Connected clients: " + emitters.size();
    }
}
