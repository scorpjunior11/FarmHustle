package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.DeliveryOffer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryOfferRepository extends JpaRepository<DeliveryOffer, UUID> {
    List<DeliveryOffer> findByRequestIdOrderByCreatedAtDesc(UUID requestId);
    List<DeliveryOffer> findByDriverIdOrderByCreatedAtDesc(UUID driverId);
    Optional<DeliveryOffer> findByRequestIdAndDriverId(UUID requestId, UUID driverId);
}
