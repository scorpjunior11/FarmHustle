package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.Product;
import com.farmhustle.farmhustle_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findAllByOrderByCreatedAtDesc();

    List<Product> findAllByFarmerOrderByCreatedAtDesc(User farmer);

    List<Product> findAllByIsActiveOrderByCreatedAtDesc(Boolean isActive);
}
