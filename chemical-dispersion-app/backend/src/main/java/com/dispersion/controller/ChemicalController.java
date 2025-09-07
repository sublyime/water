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
            ChemicalProperties chemical = chemicalService.getOrFetchChemicalProperties(name);
            return ResponseEntity.ok(chemical);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<ChemicalProperties> storeChemicalData(@RequestBody ChemicalProperties chemical) {
        try {
            ChemicalProperties saved = chemicalService.saveChemical(chemical);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
