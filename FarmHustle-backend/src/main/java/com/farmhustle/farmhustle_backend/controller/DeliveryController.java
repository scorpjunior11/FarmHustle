package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.TransportStatus;
import com.farmhustle.farmhustle_backend.service.DeliveryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

    public DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @PostMapping
    public ResponseEntity<Delivery> create(@RequestBody Delivery delivery) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deliveryService.requestDelivery(delivery));
    }

    @GetMapping
    public ResponseEntity<List<Delivery>> getAll() {
        return ResponseEntity.ok(deliveryService.getAllDeliveries());
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<List<Delivery>> getByProvider(@PathVariable UUID providerId) {
        return ResponseEntity.ok(deliveryService.getDeliveriesByProvider(providerId));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<Delivery>> getByOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveriesByOrder(orderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(deliveryService.getDeliveryById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable UUID id, @RequestBody AcceptRequest body) {
        try {
            return ResponseEntity.ok(deliveryService.acceptDelivery(
                    id, body.providerId(), body.deliveryFee(), body.commissionAmount()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/accept-fee")
    public ResponseEntity<?> acceptFee(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(deliveryService.acceptFee(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/decline-fee")
    public ResponseEntity<?> declineFee(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(deliveryService.declineFee(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody StatusRequest body) {
        try {
            return ResponseEntity.ok(deliveryService.updateStatus(id, body.status()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/confirm-provider")
    public ResponseEntity<?> confirmByProvider(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(deliveryService.confirmByProvider(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/confirm-buyer")
    public ResponseEntity<?> confirmByBuyer(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(deliveryService.confirmByBuyer(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private record AcceptRequest(UUID providerId, Double deliveryFee, Double commissionAmount) {}
    private record StatusRequest(TransportStatus status) {}
}
