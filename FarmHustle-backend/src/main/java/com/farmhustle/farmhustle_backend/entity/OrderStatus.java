package com.farmhustle.farmhustle_backend.entity;

public enum OrderStatus {
    PENDING,
    NEGOTIATING,
    AWAITING_PAYMENT,
    PAID,
    AWAITING_TRANSPORT,
    IN_TRANSIT,
    DELIVERED,
    COMPLETED,
    CANCELLED
}