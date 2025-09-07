package com.dispersion.controller;

import com.dispersion.model.Spill;
import com.dispersion.service.DispersionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/real-time-updates")
public class StreamController {

    @Autowired
    private DispersionService dispersionService;

    @Autowired
    private ObjectMapper objectMapper;

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUpdates() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        try {
            // Send initial data
            List<Spill> activeSpills = dispersionService.getActiveSpills();
            String jsonData = objectMapper.writeValueAsString(activeSpills);
            emitter.send(SseEmitter.event().data(jsonData));

            // Add emitter to service for future updates
            dispersionService.addClient(emitter);

        } catch (Exception e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }
}
