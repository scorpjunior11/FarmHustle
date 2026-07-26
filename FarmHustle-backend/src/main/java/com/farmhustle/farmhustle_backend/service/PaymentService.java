package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.entity.TransportStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final String PAYSTACK_BASE_URL = "https://api.paystack.co";

    private final OrderService orderService;
    private final DeliveryService deliveryService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String secretKey;

    public PaymentService(OrderService orderService,
                          DeliveryService deliveryService,
                          @Value("${paystack.secret.key}") String secretKey) {
        this.orderService = orderService;
        this.deliveryService = deliveryService;
        this.secretKey = secretKey;
    }

    public record InitializeResult(String authorizationUrl, String reference) {}

    public record VerifyResult(String status, Order order) {}

    public record VerifyDeliveryResult(String status, Delivery delivery) {}

    // ─── Order payments ─────────────────────────────────────────

    public InitializeResult initializeTransaction(UUID orderId) {
        Order order = orderService.getOrderById(orderId);
        if (order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new RuntimeException(
                    "Order can only be paid in AWAITING_PAYMENT status, current status: " + order.getStatus());
        }

        Double effectivePrice = order.getAgreedPrice() != null ? order.getAgreedPrice() : order.getInitialPrice();
        long amountPesewas = toPesewas(effectivePrice, "Order has no valid price to charge.");

        Map<String, Object> data = paystackInitialize(
                order.getBuyer().getEmail(),
                amountPesewas,
                Map.of("orderId", order.getId().toString()));
        return toInitializeResult(data);
    }

    public VerifyResult verifyTransaction(String reference) {
        Map<String, Object> data = paystackVerify(reference);

        String paystackStatus = (String) data.get("status");
        if (!"success".equals(paystackStatus)) {
            return new VerifyResult(paystackStatus != null ? paystackStatus : "unknown", null);
        }

        UUID orderId = metadataUuid(data, "orderId");
        Order order = orderService.getOrderById(orderId);
        if (order.getStatus() == OrderStatus.PAID) {
            // Already marked (e.g. verify called twice) — treat as success, don't re-transition.
            return new VerifyResult("success", order);
        }
        order = orderService.updateStatus(orderId, OrderStatus.PAID);
        return new VerifyResult("success", order);
    }

    // ─── Delivery fee payments ──────────────────────────────────

    public InitializeResult initializeDeliveryPayment(UUID deliveryId) {
        Delivery delivery = deliveryService.getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.ACCEPTED) {
            throw new RuntimeException(
                    "Delivery fee can only be paid in ACCEPTED status (after a provider sets the fee), current status: "
                            + delivery.getStatus());
        }
        if (Boolean.TRUE.equals(delivery.getFeePaid())) {
            throw new RuntimeException("Delivery fee has already been paid.");
        }
        if (delivery.getOrder() == null || delivery.getOrder().getBuyer() == null) {
            throw new RuntimeException("Standalone deliveries (no order) can't be paid online yet.");
        }

        long amountPesewas = toPesewas(delivery.getDeliveryFee(), "Delivery has no valid fee to charge.");

        Map<String, Object> data = paystackInitialize(
                delivery.getOrder().getBuyer().getEmail(),
                amountPesewas,
                Map.of("deliveryId", delivery.getId().toString(), "type", "delivery"));
        return toInitializeResult(data);
    }

    public VerifyDeliveryResult verifyDeliveryPayment(String reference) {
        Map<String, Object> data = paystackVerify(reference);

        String paystackStatus = (String) data.get("status");
        if (!"success".equals(paystackStatus)) {
            return new VerifyDeliveryResult(paystackStatus != null ? paystackStatus : "unknown", null);
        }

        UUID deliveryId = metadataUuid(data, "deliveryId");
        Delivery delivery = deliveryService.getDeliveryById(deliveryId);
        if (Boolean.TRUE.equals(delivery.getFeePaid())) {
            // Already marked (e.g. verify called twice) — idempotent success.
            return new VerifyDeliveryResult("success", delivery);
        }
        delivery = deliveryService.markFeePaid(deliveryId);
        return new VerifyDeliveryResult("success", delivery);
    }

    // ─── Shared Paystack helpers ────────────────────────────────

    private long toPesewas(Double amount, String invalidMessage) {
        if (amount == null || amount <= 0) {
            throw new RuntimeException(invalidMessage);
        }
        // Paystack expects an integer amount in the currency's minor unit (pesewas for GHS).
        return BigDecimal.valueOf(amount)
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> paystackInitialize(String email, long amountPesewas, Map<String, Object> metadata) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(secretKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> body = Map.of(
                "email", email,
                "amount", amountPesewas,
                "currency", "GHS",
                "metadata", metadata);

        Map<String, Object> data;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    PAYSTACK_BASE_URL + "/transaction/initialize",
                    new HttpEntity<>(body, headers),
                    Map.class);
            data = response.getBody() != null ? (Map<String, Object>) response.getBody().get("data") : null;
        } catch (RestClientResponseException e) {
            throw new RuntimeException(
                    "Paystack initialize failed (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new RuntimeException("Could not reach Paystack: " + e.getMessage());
        }

        if (data == null) {
            throw new RuntimeException("Unexpected Paystack response: missing data.");
        }
        return data;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> paystackVerify(String reference) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(secretKey);

        Map<String, Object> data;
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    PAYSTACK_BASE_URL + "/transaction/verify/" + reference,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class);
            data = response.getBody() != null ? (Map<String, Object>) response.getBody().get("data") : null;
        } catch (RestClientResponseException e) {
            throw new RuntimeException(
                    "Paystack verify failed (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new RuntimeException("Could not reach Paystack: " + e.getMessage());
        }

        if (data == null) {
            throw new RuntimeException("Unexpected Paystack response: missing data.");
        }
        return data;
    }

    private InitializeResult toInitializeResult(Map<String, Object> data) {
        if (data.get("authorization_url") == null || data.get("reference") == null) {
            throw new RuntimeException("Unexpected Paystack response: missing authorization_url/reference.");
        }
        return new InitializeResult((String) data.get("authorization_url"), (String) data.get("reference"));
    }

    @SuppressWarnings("unchecked")
    private UUID metadataUuid(Map<String, Object> data, String key) {
        Object metadataObj = data.get("metadata");
        if (!(metadataObj instanceof Map) || ((Map<String, Object>) metadataObj).get(key) == null) {
            throw new RuntimeException("Payment verified but no " + key + " found in transaction metadata.");
        }
        return UUID.fromString((String) ((Map<String, Object>) metadataObj).get(key));
    }
}
