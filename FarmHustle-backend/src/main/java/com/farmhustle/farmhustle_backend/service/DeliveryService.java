package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.TransportStatus;
import com.farmhustle.farmhustle_backend.repository.DeliveryRepository;
import org.springframework.stereotype.Service;

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
                Set.of(TransportStatus.ACCEPTED, TransportStatus.DECLINED));
        ALLOWED_TRANSITIONS.put(TransportStatus.ACCEPTED,
                Set.of(TransportStatus.IN_TRANSIT));
        ALLOWED_TRANSITIONS.put(TransportStatus.IN_TRANSIT,
                Set.of(TransportStatus.DELIVERED));
    }

    private final DeliveryRepository deliveryRepository;

    public DeliveryService(DeliveryRepository deliveryRepository) {
        this.deliveryRepository = deliveryRepository;
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
        return deliveryRepository.findAll();
    }

    public Delivery getDeliveryById(UUID id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + id));
    }

    public List<Delivery> getDeliveriesByProvider(UUID providerId) {
        return deliveryRepository.findByProviderId(providerId);
    }

    public List<Delivery> getDeliveriesByOrder(UUID orderId) {
        return deliveryRepository.findByOrderId(orderId);
    }

    public Delivery acceptDelivery(UUID deliveryId, Double deliveryFee, Double commissionAmount) {
        Delivery delivery = getDeliveryById(deliveryId);
        if (delivery.getStatus() != TransportStatus.REQUESTED) {
            throw new RuntimeException(
                    "Delivery can only be accepted from REQUESTED status, current status: "
                            + delivery.getStatus());
        }
        delivery.setDeliveryFee(deliveryFee);
        delivery.setCommissionAmount(commissionAmount);
        delivery.setStatus(TransportStatus.ACCEPTED);
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
        delivery.setStatus(newStatus);
        delivery.setUpdatedAt(LocalDateTime.now());
        return deliveryRepository.save(delivery);
    }

    public Delivery confirmByProvider(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        delivery.setProviderConfirmed(true);
        delivery.setUpdatedAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);
        checkBothConfirmed(delivery);
        return delivery;
    }

    public Delivery confirmByBuyer(UUID deliveryId) {
        Delivery delivery = getDeliveryById(deliveryId);
        delivery.setBuyerConfirmed(true);
        delivery.setUpdatedAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);
        checkBothConfirmed(delivery);
        return delivery;
    }

    private void checkBothConfirmed(Delivery delivery) {
        if (Boolean.TRUE.equals(delivery.getProviderConfirmed())
                && Boolean.TRUE.equals(delivery.getBuyerConfirmed())
                && delivery.getStatus() == TransportStatus.IN_TRANSIT) {
            delivery.setStatus(TransportStatus.DELIVERED);
            delivery.setUpdatedAt(LocalDateTime.now());
            deliveryRepository.save(delivery);
        }
    }

    private boolean isValidTransition(TransportStatus current, TransportStatus next) {
        Set<TransportStatus> allowed = ALLOWED_TRANSITIONS.get(current);
        return allowed != null && allowed.contains(next);
    }
}
