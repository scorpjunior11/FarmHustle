package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

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

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order createOrder(Order order) {
        order.setStatus(OrderStatus.AWAITING_PAYMENT);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrderById(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found: " + id));
    }

    public List<Order> getOrdersByBuyer(UUID buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }

    public List<Order> getOrdersByFarmer(UUID farmerId) {
        return orderRepository.findByFarmerId(farmerId);
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
