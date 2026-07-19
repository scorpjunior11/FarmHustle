package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Product;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
import com.farmhustle.farmhustle_backend.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAll() {
        return ResponseEntity.ok(productService.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Product>> getActive() {
        return ResponseEntity.ok(productService.getActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable UUID id) {
        return productService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody Product product) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody Product product) {
        Optional<Product> existing = productService.getById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this product.");
        }
        product.setId(id);
        return ResponseEntity.ok(productService.update(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        Optional<Product> existing = productService.getById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this product.");
        }
        try {
            productService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivate(@PathVariable UUID id) {
        Optional<Product> existing = productService.getById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this product.");
        }
        try {
            return ResponseEntity.ok(productService.deactivate(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivate(@PathVariable UUID id) {
        Optional<Product> existing = productService.getById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this product.");
        }
        try {
            return ResponseEntity.ok(productService.reactivate(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/details")
    public ResponseEntity<?> updateDetails(@PathVariable UUID id, @Valid @RequestBody ProductDetailsRequest body) {
        Optional<Product> existing = productService.getById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this product.");
        }
        try {
            return ResponseEntity.ok(productService.updateDetails(id, body.price(), body.quantityAvailable()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private boolean isOwner(Product product) {
        return product.getFarmer() != null && CurrentUser.id().equals(product.getFarmer().getId());
    }

    private record ProductDetailsRequest(
            @NotNull @Positive Double price,
            @NotNull @Positive Double quantityAvailable) {}
}
