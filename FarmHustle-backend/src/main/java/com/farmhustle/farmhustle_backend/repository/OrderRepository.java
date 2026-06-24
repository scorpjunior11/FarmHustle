package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
}
