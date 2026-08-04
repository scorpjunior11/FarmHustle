package com.farmhustle.farmhustle_backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "delivery_offers")
public class DeliveryOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private Delivery request;

    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @NotNull
    @Column(nullable = false)
    private Double currentAmount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferActor lastActor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferStatus status = OfferStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Delivery getRequest() {
        return request;
    }

    public void setRequest(Delivery request) {
        this.request = request;
    }

    public User getDriver() {
        return driver;
    }

    public void setDriver(User driver) {
        this.driver = driver;
    }

    public Double getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(Double currentAmount) {
        this.currentAmount = currentAmount;
    }

    public OfferActor getLastActor() {
        return lastActor;
    }

    public void setLastActor(OfferActor lastActor) {
        this.lastActor = lastActor;
    }

    public OfferStatus getStatus() {
        return status;
    }

    public void setStatus(OfferStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

}
