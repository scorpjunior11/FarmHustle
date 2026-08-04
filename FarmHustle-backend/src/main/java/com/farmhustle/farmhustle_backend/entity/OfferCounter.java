package com.farmhustle.farmhustle_backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "offer_counters")
public class OfferCounter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "offer_id", nullable = false)
    private DeliveryOffer offer;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferActor actor;

    @NotNull
    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public DeliveryOffer getOffer() {
        return offer;
    }

    public void setOffer(DeliveryOffer offer) {
        this.offer = offer;
    }

    public OfferActor getActor() {
        return actor;
    }

    public void setActor(OfferActor actor) {
        this.actor = actor;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}
