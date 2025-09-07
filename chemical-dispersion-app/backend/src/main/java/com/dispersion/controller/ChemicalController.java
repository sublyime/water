package com.dispersion.controller;

import com.dispersion.model.ChemicalProperties;
import com.dispersion.service.ChemicalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dispersion/chemicals")
@CrossOrigin(origins = "*")
public class ChemicalController {

    @Autowired
    private ChemicalService chemicalService;

    @GetMapping("/{name}")
    public ResponseEntity<ChemicalProperties> getChemicalProperties(@PathVariable String name) {
        try {
            System.out.println("Fetching chemical properties for: " + name);
            ChemicalProperties chemical = chemicalService.getOrFetchChemicalProperties(name);
            if (chemical != null) {
                return ResponseEntity.ok(chemical);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("Error fetching chemical properties: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    public ResponseEntity<ChemicalProperties> storeChemicalData(@RequestBody ChemicalProperties chemical) {
        try {
            System.out.println("Storing chemical data for: " + chemical.getName());
            ChemicalProperties saved = chemicalService.saveChemical(chemical);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error storing chemical data: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search/{query}")
    public ResponseEntity<ChemicalProperties> searchChemical(@PathVariable String query) {
        try {
            System.out.println("Searching for chemical: " + query);
            ChemicalProperties chemical = chemicalService.getOrFetchChemicalProperties(query);
            return ResponseEntity.ok(chemical);
        } catch (Exception e) {
            System.err.println("Error searching chemical: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Chemical service is operational");
    }
}
