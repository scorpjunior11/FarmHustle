package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.entity.Product;
import com.farmhustle.farmhustle_backend.repository.OrderRepository;
import com.farmhustle.farmhustle_backend.repository.ProductRepository;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
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
    private final PushNotificationService pushNotificationService;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository,
                        PushNotificationService pushNotificationService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.pushNotificationService = pushNotificationService;
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
        Order savedOrder = orderRepository.save(order);

        // EVENT 1: Notify farmer of new order (best-effort, after persistence)
        notifyOrderCreated(savedOrder);

        return savedOrder;
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
        Order updatedOrder = orderRepository.save(order);

        // Notifications: best-effort side-effects after state change is persisted
        if (newStatus == OrderStatus.AWAITING_PAYMENT) {
            // EVENT 3: Notify buyer that order was accepted
            notifyOrderAccepted(updatedOrder);
        } else if (newStatus == OrderStatus.CANCELLED) {
            // EVENT 4: Notify buyer if FARMER cancelled (not if buyer cancelled self)
            notifyOrderDeclined(updatedOrder);
        }

        return updatedOrder;
    }

    private boolean isValidTransition(OrderStatus current, OrderStatus next) {
        Set<OrderStatus> allowed = ALLOWED_TRANSITIONS.get(current);
        return allowed != null && allowed.contains(next);
    }

    // ─── Notification Helpers ───────────────────────────────────

    private String getFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return null;
        }
        return fullName.split("\\s+")[0];
    }

    private void notifyOrderCreated(Order order) {
        try {
            if (order == null || order.getFarmer() == null || order.getProduct() == null) {
                return;
            }
            String buyerFirstName = getFirstName(order.getBuyer() != null ? order.getBuyer().getName() : null);
            String productName = order.getProduct().getName();
            if (buyerFirstName == null || productName == null) {
                return;
            }
            String title = "New order";
            String body = buyerFirstName + " placed an order for your " + productName + ".";
            pushNotificationService.sendToUser(order.getFarmer(), title, body);
        } catch (Exception e) {
            // Best-effort: log and swallow
        }
    }

    private void notifyOrderAccepted(Order order) {
        try {
            if (order == null || order.getBuyer() == null || order.getFarmer() == null || order.getProduct() == null) {
                return;
            }
            String farmerFirstName = getFirstName(order.getFarmer().getName());
            String productName = order.getProduct().getName();
            if (farmerFirstName == null || productName == null) {
                return;
            }
            String title = "Order accepted";
            String body = farmerFirstName + " accepted your order for " + productName + ". You can now pay.";
            pushNotificationService.sendToUser(order.getBuyer(), title, body);
        } catch (Exception e) {
            // Best-effort: log and swallow
        }
    }

    private void notifyOrderDeclined(Order order) {
        try {
            if (order == null || order.getBuyer() == null || order.getFarmer() == null || order.getProduct() == null) {
                return;
            }
            // Only notify buyer if the farmer (not the buyer) cancelled
            UUID callerId = CurrentUser.id();
            if (order.getBuyer().getId().equals(callerId)) {
                // Buyer cancelled their own order — don't notify them
                return;
            }
            String farmerFirstName = getFirstName(order.getFarmer().getName());
            String productName = order.getProduct().getName();
            if (farmerFirstName == null || productName == null) {
                return;
            }
            String title = "Order declined";
            String body = farmerFirstName + " declined your order for " + productName + ".";
            pushNotificationService.sendToUser(order.getBuyer(), title, body);
        } catch (Exception e) {
            // Best-effort: log and swallow
        }
    }
}
