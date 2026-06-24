package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {
}
