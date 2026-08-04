package com.farmhustle.farmhustle_backend.dto;

import com.farmhustle.farmhustle_backend.entity.OfferActor;
import com.farmhustle.farmhustle_backend.entity.OfferStatus;

import java.time.LocalDateTime;
import java.util.UUID;

// Purpose-shaped view of a DeliveryOffer for the buyer's offer list —
// exposes only the driver fields the buyer's UI needs, never the User entity.
public record OfferSummaryResponse(
        UUID offerId,
        UUID driverId,
        String driverName,
        String driverCity,
        String driverPhone,
        Double currentAmount,
        OfferActor lastActor,
        OfferStatus status,
        LocalDateTime updatedAt
) {}
