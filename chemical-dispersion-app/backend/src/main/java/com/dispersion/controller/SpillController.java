package com.dispersion.controller;

import com.dispersion.model.Spill;
import com.dispersion.service.SpillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/dispersion")
public class SpillController {

    @Autowired
    private SpillService spillService;

    @GetMapping("/spills")
    public List<Spill> getAllSpills() {
        return spillService.findAll();
    }
}