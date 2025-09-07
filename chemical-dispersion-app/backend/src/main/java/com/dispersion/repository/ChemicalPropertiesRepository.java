package com.dispersion.repository;

import com.dispersion.model.ChemicalProperties;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChemicalPropertiesRepository extends JpaRepository<ChemicalProperties, UUID> {

    Optional<ChemicalProperties> findByNameIgnoreCase(String name);

    List<ChemicalProperties> findByToxicityLevel(String toxicityLevel);

    Optional<ChemicalProperties> findByCid(Long cid);

    List<ChemicalProperties> findByNameContainingIgnoreCase(String nameFragment);
}
