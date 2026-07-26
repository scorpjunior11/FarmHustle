package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);
    List<Order> findByFarmerIdOrderByCreatedAtDesc(UUID farmerId);
    boolean existsByProductId(UUID productId);
}
