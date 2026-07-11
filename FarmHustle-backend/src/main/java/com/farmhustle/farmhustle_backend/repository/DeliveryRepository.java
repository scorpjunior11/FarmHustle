package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {
    List<Delivery> findAllByOrderByCreatedAtDesc();
    List<Delivery> findByProviderIdOrderByCreatedAtDesc(UUID providerId);
    List<Delivery> findByOrderIdOrderByCreatedAtDesc(UUID orderId);
}
