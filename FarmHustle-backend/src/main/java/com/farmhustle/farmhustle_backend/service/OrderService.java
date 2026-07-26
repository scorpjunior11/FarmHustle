package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.entity.Product;
import com.farmhustle.farmhustle_backend.repository.OrderRepository;
import com.farmhustle.farmhustle_backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

    // Platform commission on a product sale — server-derived, never trusted from the client.
    private static final double PRODUCT_COMMISSION_RATE = 0.05;

    // All legal forward transitions. States not in the map (COMPLETED, CANCELLED) are terminal.
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS;

    static {
        ALLOWED_TRANSITIONS = new EnumMap<>(OrderStatus.class);
        ALLOWED_TRANSITIONS.put(OrderStatus.PENDING,
                Set.of(OrderStatus.NEGOTIATING, OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.NEGOTIATING,
                Set.of(OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.AWAITING_PAYMENT,
                Set.of(OrderStatus.NEGOTIATING, OrderStatus.PAID, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.PAID,
                Set.of(OrderStatus.AWAITING_TRANSPORT, OrderStatus.COMPLETED));
        ALLOWED_TRANSITIONS.put(OrderStatus.AWAITING_TRANSPORT,
                Set.of(OrderStatus.IN_TRANSIT));
        ALLOWED_TRANSITIONS.put(OrderStatus.IN_TRANSIT,
                Set.of(OrderStatus.DELIVERED));
        ALLOWED_TRANSITIONS.put(OrderStatus.DELIVERED,
                Set.of(OrderStatus.COMPLETED));
    }

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    public Order createOrder(Order order) {
        if (order.getProduct() == null || order.getProduct().getId() == null) {
            throw new RuntimeException("A product must be specified.");
        }
        Product product = productRepository.findById(order.getProduct().getId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + order.getProduct().getId()));

        if (!Boolean.TRUE.equals(product.getIsActive())) {
            throw new RuntimeException("This product is no longer available.");
        }

        Double quantity = order.getQuantity();
        if (quantity == null || quantity < 1) {
            throw new RuntimeException("Quantity must be at least 1.");
        }
        if (quantity > product.getQuantityAvailable()) {
            throw new RuntimeException("Only " + formatQuantity(product.getQuantityAvailable()) + " units available.");
        }

        // Farmer, price and commission rate are derived from the product — never trusted from the client.
        order.setProduct(product);
        order.setFarmer(product.getFarmer());
        order.setInitialPrice(product.getPrice() * quantity);
        order.setPlatformCommissionRate(PRODUCT_COMMISSION_RATE);

        order.setStatus(OrderStatus.PENDING);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    private String formatQuantity(double value) {
        if (value == Math.floor(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(value);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    public Order getOrderById(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }

    public List<Order> getOrdersByBuyer(UUID buyerId) {
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId);
    }

    public List<Order> getOrdersByFarmer(UUID farmerId) {
        return orderRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId);
    }

    public Order updateStatus(UUID orderId, OrderStatus newStatus) {
        Order order = getOrderById(orderId);
        OrderStatus current = order.getStatus();
        if (!isValidTransition(current, newStatus)) {
            throw new RuntimeException(
                    "Invalid status transition from " + current + " to " + newStatus);
        }
        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    private boolean isValidTransition(OrderStatus current, OrderStatus next) {
        Set<OrderStatus> allowed = ALLOWED_TRANSITIONS.get(current);
        return allowed != null && allowed.contains(next);
    }
}
