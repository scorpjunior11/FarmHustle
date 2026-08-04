package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.OfferCounter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OfferCounterRepository extends JpaRepository<OfferCounter, UUID> {
    List<OfferCounter> findByOfferIdOrderByCreatedAtAsc(UUID offerId);
}
