package com.farmhustle.farmhustle_backend.dto;

import com.farmhustle.farmhustle_backend.entity.OfferActor;
import com.farmhustle.farmhustle_backend.entity.OfferStatus;

import java.time.LocalDateTime;
import java.util.UUID;

// Purpose-shaped view of a DeliveryOffer for the driver's own negotiation list —
// minimal on purpose: the frontend joins requestId against the existing
// getDeliveries() payload (already polled on the transport side) to get
// route/product/buyer detail, rather than duplicating that here.
public record DriverOfferSummary(
        UUID offerId,
        UUID requestId,
        Double currentAmount,
        OfferActor lastActor,
        OfferStatus status,
        LocalDateTime updatedAt
) {}
