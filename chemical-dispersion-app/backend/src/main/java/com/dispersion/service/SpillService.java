package com.dispersion.service;

import com.dispersion.model.Spill;
import com.dispersion.repository.SpillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SpillService {

    @Autowired
    private SpillRepository spillRepository;

    public Spill save(Spill spill) {
        return spillRepository.save(spill);
    }

    public List<Spill> findAll() {
        return spillRepository.findAll();
    }

    // Fixed parameter type from String to UUID to match repository expectations
    public Optional<Spill> findById(UUID id) {
        return spillRepository.findById(id);
    }

    // Fixed parameter type from String to UUID to match repository expectations
    public void deleteById(UUID id) {
        spillRepository.deleteById(id);
    }

    // Additional helper method for String ID conversion if needed
    public Optional<Spill> findByIdString(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return spillRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    // Additional helper method for String ID conversion if needed
    public void deleteByIdString(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            spillRepository.deleteById(uuid);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid UUID format: " + id);
        }
    }
}