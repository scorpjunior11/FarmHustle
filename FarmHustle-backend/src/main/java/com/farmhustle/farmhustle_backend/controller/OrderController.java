package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.service.OrderService;
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
    public ResponseEntity<Order> create(@RequestBody Order order) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(order));
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
    public ResponseEntity<Order> updateStatus(@PathVariable UUID id, @RequestBody StatusRequest body) {
        return ResponseEntity.ok(orderService.updateStatus(id, body.status()));
    }

    private record StatusRequest(OrderStatus status) {}
}
