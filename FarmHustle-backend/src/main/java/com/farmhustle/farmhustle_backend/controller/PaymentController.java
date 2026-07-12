package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initialize")
    public ResponseEntity<?> initialize(@RequestBody InitializeRequest body) {
        try {
            PaymentService.InitializeResult result = paymentService.initializeTransaction(body.orderId());
            return ResponseEntity.ok(Map.of(
                    "authorizationUrl", result.authorizationUrl(),
                    "reference", result.reference()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/verify/{reference}")
    public ResponseEntity<?> verify(@PathVariable String reference) {
        try {
            PaymentService.VerifyResult result = paymentService.verifyTransaction(reference);
            Map<String, Object> response = new HashMap<>();
            response.put("status", result.status());
            response.put("order", result.order());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/delivery/initialize")
    public ResponseEntity<?> initializeDelivery(@RequestBody DeliveryInitializeRequest body) {
        try {
            PaymentService.InitializeResult result = paymentService.initializeDeliveryPayment(body.deliveryId());
            return ResponseEntity.ok(Map.of(
                    "authorizationUrl", result.authorizationUrl(),
                    "reference", result.reference()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/delivery/verify/{reference}")
    public ResponseEntity<?> verifyDelivery(@PathVariable String reference) {
        try {
            PaymentService.VerifyDeliveryResult result = paymentService.verifyDeliveryPayment(reference);
            Map<String, Object> response = new HashMap<>();
            response.put("status", result.status());
            response.put("delivery", result.delivery());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private record InitializeRequest(UUID orderId) {}
    private record DeliveryInitializeRequest(UUID deliveryId) {}
}
