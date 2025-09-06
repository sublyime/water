package com.dispersion.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dispersion")
public class DispersionController {

    @GetMapping("/")
    public String home() {
        return "Welcome to the Chemical Dispersion App!";
    }

    @GetMapping("/info")
    public String getInfo() {
        return "This is information about chemical dispersion.";
    }

    // Add more endpoints as needed
}