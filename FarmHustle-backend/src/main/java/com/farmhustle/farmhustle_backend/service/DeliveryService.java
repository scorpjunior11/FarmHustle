package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.Order;
import com.farmhustle.farmhustle_backend.entity.OrderStatus;
import com.farmhustle.farmhustle_backend.entity.TransportStatus;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.repository.DeliveryRepository;
import com.farmhustle.farmhustle_backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class DeliveryService {

    // Terminal states (DECLINED, DELIVERED) have no entry — no transitions out.
    private static final Map<TransportStatus, Set<TransportStatus>> ALLOWED_TRANSITIONS;

    static {
        ALLOWED_TRANSITIONS = new EnumMap<>(TransportStatus.class);
        ALLOWED_TRANSITIONS.put(TransportStatus.REQUESTED,
                Set.of(TransportStatus.FEE_PROPOSED, TransportStatus.DECLINED));
        ALLOWED_TRANSITIONS.put(TransportStatus.FEE_PROPOSED,
                Set.of(TransportStatus.ACCEPTED, TransportStatus.REQUESTED, TransportStatus.DECLINED));
        ALLOWED_TRANSITIONS.put(TransportStatus.ACCEPTED,
                Set.of(TransportStatus.IN_TRANSIT));
        ALLOWED_TRANSITIONS.put(TransportStatus.IN_TRANSIT,
                Set.of(TransportStatus.DELIVERED));
    }

    private static final Logger log = LoggerFactory.getLogger(DeliveryService.class);

    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final PushNotificationService pushNotificationService;

    public DeliveryService(DeliveryRepository deliveryRepository, UserRepository userRepository,
                            OrderService orderService, PushNotificationService pushNotificationService) {
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.pushNotificationService = pushNotificationService;
    }

    public Delivery requestDelivery(Delivery delivery) {
        delivery.setStatus(TransportStatus.REQUESTED);
        delivery.setProviderConfirmed(false);
        delivery.setBuyerConfirmed(false);
        delivery.setCreatedAt(LocalDateTime.now());
        delivery.setUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    public List<Delivery> getAllDeliveries() {
        return deliveryRepository.findAllByOrderByCreatedAtDesc();
    }

    public Delivery getDeliveryById(UUID id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + id));
    }

    public List<Delivery> getDeliveriesByProvider(UUID providerId) {
        return deliveryRepository.findByProviderIdOrderByCreatedAtDesc(providerId);
    }

    public List<Delivery> getDeliveriesByOrder(UUID orderId) {
        return deliveryRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    public Delivery acceptDelivery(UUID deliveryId, UUID providerId, Double deliveryFee, Double commissionAmount) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.REQUESTED) {
            throw new RuntimeException(
                    "Delivery can only be accepted from REQUESTED status, current status: "
                            + delivery.getStatus());
        }
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerId));
        delivery.setProvider(provider);
        delivery.setDeliveryFee(deliveryFee);
        delivery.setCommissionAmount(commissionAmount);
        delivery.setStatus(TransportStatus.FEE_PROPOSED);
        delivery.setUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    public Delivery acceptFee(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.FEE_PROPOSED) {
            throw new RuntimeException(
                    "Fee can only be accepted from FEE_PROPOSED status, current status: "
                            + delivery.getStatus());
        }
        delivery.setStatus(TransportStatus.ACCEPTED);
        delivery.setUpdatedAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);
        propagateOrderStatus(delivery, OrderStatus.AWAITING_TRANSPORT);
        return delivery;
    }

    public Delivery declineFee(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.FEE_PROPOSED) {
            throw new RuntimeException(
                    "Fee can only be declined from FEE_PROPOSED status, current status: "
                            + delivery.getStatus());
        }
        // Back to an open job: clear the proposal so another provider can take it.
        delivery.setProvider(null);
        delivery.setDeliveryFee(null);
        delivery.setCommissionAmount(null);
        delivery.setStatus(TransportStatus.REQUESTED);
        delivery.setUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    public Delivery markFeePaid(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        delivery.setFeePaid(true);
        delivery.setUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    public Delivery updateStatus(UUID deliveryId, TransportStatus newStatus) {
        Delivery delivery = getDeliveryById(deliveryId);
        TransportStatus current = delivery.getStatus();
        if (!isValidTransition(current, newStatus)) {
            throw new RuntimeException(
                    "Invalid status transition from " + current + " to " + newStatus);
        }
        // A provider can't start a delivery before the buyer has paid the fee.
        // Standalone deliveries (no linked order) can never be paid online at all —
        // see PaymentService.initializeDeliveryPayment — so they're exempt, or they'd
        // be permanently unstartable.
        if (newStatus == TransportStatus.IN_TRANSIT
                && delivery.getOrder() != null
                && !Boolean.TRUE.equals(delivery.getFeePaid())) {
            throw new IllegalStateException("The buyer has not paid the delivery fee yet.");
        }
        delivery.setStatus(newStatus);
        delivery.setUpdatedAt(LocalDateTime.now());
        Delivery updatedDelivery = deliveryRepository.save(delivery);
        if (newStatus == TransportStatus.IN_TRANSIT) {
            propagateOrderStatus(updatedDelivery, OrderStatus.IN_TRANSIT);
            // EVENT 5: Notify buyer that delivery is in transit (best-effort, after persistence)
            notifyDeliveryInTransit(updatedDelivery);
        }
        return updatedDelivery;
    }

    @Transactional
    public Delivery confirmByProvider(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.IN_TRANSIT) {
            throw new IllegalStateException(
                    "Delivery can only be confirmed by the provider while IN_TRANSIT, current status: "
                            + delivery.getStatus());
        }
        delivery.setProviderConfirmed(true);
        delivery.setUpdatedAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);
        checkBothConfirmed(delivery);
        return delivery;
    }

    @Transactional
    public Delivery confirmByBuyer(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.IN_TRANSIT) {
            throw new IllegalStateException(
                    "Delivery can only be confirmed by the buyer while IN_TRANSIT, current status: "
                            + delivery.getStatus());
        }
        delivery.setBuyerConfirmed(true);
        delivery.setUpdatedAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);
        checkBothConfirmed(delivery);
        return delivery;
    }

    @Transactional
    private void checkBothConfirmed(Delivery delivery) {
        if (Boolean.TRUE.equals(delivery.getProviderConfirmed())
                && Boolean.TRUE.equals(delivery.getBuyerConfirmed())
                && delivery.getStatus() == TransportStatus.IN_TRANSIT) {
            delivery.setStatus(TransportStatus.DELIVERED);
            delivery.setUpdatedAt(LocalDateTime.now());
            deliveryRepository.save(delivery);
            propagateOrderStatus(delivery, OrderStatus.DELIVERED);
            propagateOrderStatus(delivery, OrderStatus.COMPLETED);
        }
    }

    // Best-effort: a transport action must never fail because the linked order
    // was in an unexpected state, and standalone deliveries have no order at all.
    private void propagateOrderStatus(Delivery delivery, OrderStatus targetStatus) {
        Order order = delivery.getOrder();
        if (order == null) {
            return;
        }
        try {
            orderService.updateStatus(order.getId(), targetStatus);
        } catch (RuntimeException e) {
            log.warn("Skipped propagating order {} to {}: {}", order.getId(), targetStatus, e.getMessage());
        }
    }

    private boolean isValidTransition(TransportStatus current, TransportStatus next) {
        Set<TransportStatus> allowed = ALLOWED_TRANSITIONS.get(current);
        return allowed != null && allowed.contains(next);
    }

    // ─── Notification Helpers ───────────────────────────────────

    private String getFirstName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return null;
        }
        return fullName.split("\\s+")[0];
    }

    private void notifyDeliveryInTransit(Delivery delivery) {
        try {
            // Skip if no linked order (standalone delivery, no buyer to notify)
            if (delivery == null || delivery.getOrder() == null) {
                return;
            }
            Order order = delivery.getOrder();
            if (order.getBuyer() == null || order.getProduct() == null || delivery.getProvider() == null) {
                return;
            }
            String driverFirstName = getFirstName(delivery.getProvider().getName());
            String productName = order.getProduct().getName();
            if (driverFirstName == null || productName == null) {
                return;
            }
            String title = "On the way";
            String body = driverFirstName + " is delivering your " + productName + ".";
            pushNotificationService.sendToUser(order.getBuyer(), title, body);
        } catch (Exception e) {
            // Best-effort: log and swallow
        }
    }

    private void notifyDeliveryCompleted(Delivery delivery) {
        try {
            // Skip if no linked order (standalone delivery, no buyer to notify)
            if (delivery == null || delivery.getOrder() == null) {
                return;
            }
            Order order = delivery.getOrder();
            if (order.getBuyer() == null || order.getProduct() == null) {
                return;
            }
            String productName = order.getProduct().getName();
            if (productName == null) {
                return;
            }
            String title = "Delivered";
            String body = "Your " + productName + " order is complete.";
            pushNotificationService.sendToUser(order.getBuyer(), title, body);
        } catch (Exception e) {
            // Best-effort: log and swallow
        }
    }
}
