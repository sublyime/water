package com.dispersion.service;

import com.dispersion.model.ChemicalProperties;
import com.dispersion.repository.ChemicalPropertiesRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class ChemicalService {

    @Autowired
    private ChemicalPropertiesRepository chemicalRepository;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ChemicalService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://pubchem.ncbi.nlm.nih.gov/rest/pug").build();
        this.objectMapper = objectMapper;
    }

    public ChemicalProperties saveChemical(ChemicalProperties chemical) {
        return chemicalRepository.save(chemical);
    }

    public ChemicalProperties getOrFetchChemicalProperties(String chemicalName) {
        // First check local database
        Optional<ChemicalProperties> existing = chemicalRepository.findByNameIgnoreCase(chemicalName);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Fetch from PubChem API
        try {
            String url = String.format(
                    "/compound/name/%s/property/MolecularFormula,MolecularWeight,IUPACName,IsomericSMILES/JSON",
                    chemicalName.replace(" ", "%20"));

            JsonNode response = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("PropertyTable") &&
                    response.get("PropertyTable").has("Properties") &&
                    response.get("PropertyTable").get("Properties").isArray() &&
                    response.get("PropertyTable").get("Properties").size() > 0) {

                JsonNode properties = response.get("PropertyTable").get("Properties").get(0);

                ChemicalProperties chemical = new ChemicalProperties();
                chemical.setName(chemicalName);
                chemical.setCid(properties.get("CID").asLong());

                if (properties.has("MolecularFormula")) {
                    chemical.setMolecularFormula(properties.get("MolecularFormula").asText());
                }

                if (properties.has("MolecularWeight")) {
                    chemical.setMolecularWeight(BigDecimal.valueOf(properties.get("MolecularWeight").asDouble()));
                }

                if (properties.has("IUPACName")) {
                    chemical.setIupacName(properties.get("IUPACName").asText());
                }

                if (properties.has("IsomericSMILES")) {
                    chemical.setSmiles(properties.get("IsomericSMILES").asText());
                }

                // Set default values for environmental properties
                chemical.setDensity(BigDecimal.valueOf(1000.0));
                chemical.setViscosity(BigDecimal.valueOf(0.001));
                chemical.setSolubility(BigDecimal.valueOf(1000.0));
                chemical.setVaporPressure(BigDecimal.valueOf(100.0));
                chemical.setDiffusionCoefficient(BigDecimal.valueOf(0.0000001));
                chemical.setDecayRate(BigDecimal.valueOf(0.0000001));
                chemical.setToxicityLevel("MEDIUM");

                return chemicalRepository.save(chemical);
            }
        } catch (Exception e) {
            System.err.println("Error fetching chemical properties for " + chemicalName + ": " + e.getMessage());
        }

        // Return default chemical if fetch fails
        ChemicalProperties defaultChemical = new ChemicalProperties();
        defaultChemical.setName(chemicalName);
        defaultChemical.setMolecularFormula("Unknown");
        defaultChemical.setDensity(BigDecimal.valueOf(1000.0));
        defaultChemical.setViscosity(BigDecimal.valueOf(0.001));
        defaultChemical.setSolubility(BigDecimal.valueOf(1000.0));
        defaultChemical.setVaporPressure(BigDecimal.valueOf(100.0));
        defaultChemical.setDiffusionCoefficient(BigDecimal.valueOf(0.0000001));
        defaultChemical.setDecayRate(BigDecimal.valueOf(0.0000001));
        defaultChemical.setToxicityLevel("MEDIUM");

        return chemicalRepository.save(defaultChemical);
    }
}
