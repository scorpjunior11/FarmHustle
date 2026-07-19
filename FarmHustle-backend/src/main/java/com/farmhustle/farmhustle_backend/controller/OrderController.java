package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
import com.farmhustle.farmhustle_backend.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Order order) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(order));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAll() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<List<Order>> getByBuyer(@PathVariable UUID buyerId) {
        return ResponseEntity.ok(orderService.getOrdersByBuyer(buyerId));
    }

    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<List<Order>> getByFarmer(@PathVariable UUID farmerId) {
        return ResponseEntity.ok(orderService.getOrdersByFarmer(farmerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody StatusRequest body) {
        try {
            Order order = orderService.getOrderById(id);
            if (!isTransitionAllowedForCaller(order, body.status())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You are not allowed to set this order to " + body.status() + ".");
            }
            return ResponseEntity.ok(orderService.updateStatus(id, body.status()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Ownership is enforced only for this client-facing endpoint. DeliveryService's
    // propagation calls go straight to OrderService.updateStatus and never pass
    // through this method, so they are unaffected by this check.
    private boolean isTransitionAllowedForCaller(Order order, OrderStatus newStatus) {
        UUID callerId = CurrentUser.id();
        boolean isBuyer = order.getBuyer() != null && callerId.equals(order.getBuyer().getId());
        boolean isFarmer = order.getFarmer() != null && callerId.equals(order.getFarmer().getId());

        if (newStatus == OrderStatus.CANCELLED) {
            return isBuyer || isFarmer;
        }
        if (newStatus == OrderStatus.AWAITING_PAYMENT) {
            return isFarmer;
        }
        return false;
    }

    private record StatusRequest(OrderStatus status) {}
}
