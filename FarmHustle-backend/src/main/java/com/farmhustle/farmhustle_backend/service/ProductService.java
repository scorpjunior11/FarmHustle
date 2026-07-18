package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Product;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.repository.OrderRepository;
import com.farmhustle.farmhustle_backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public ProductService(ProductRepository productRepository, OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    public Product create(Product product) {
        return productRepository.save(product);
    }

    public List<Product> getAll() {
        return productRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<Product> getById(UUID id) {
        return productRepository.findById(id);
    }

    public List<Product> getByFarmer(User farmer) {
        return productRepository.findAllByFarmerOrderByCreatedAtDesc(farmer);
    }

    public List<Product> getActive() {
        return productRepository.findAllByIsActiveOrderByCreatedAtDesc(true);
    }

    public Product update(Product product) {
        return productRepository.save(product);
    }

    public Product deactivate(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        product.setIsActive(false);
        return productRepository.save(product);
    }

    public Product reactivate(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        product.setIsActive(true);
        return productRepository.save(product);
    }

    public Product updateDetails(UUID id, Double price, Double quantityAvailable) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        product.setPrice(price);
        product.setQuantityAvailable(quantityAvailable);
        return productRepository.save(product);
    }

    public void delete(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        if (orderRepository.existsByProductId(product.getId())) {
            throw new RuntimeException("Can't delete a product that has orders — deactivate it instead");
        }
        productRepository.deleteById(id);
    }
}
