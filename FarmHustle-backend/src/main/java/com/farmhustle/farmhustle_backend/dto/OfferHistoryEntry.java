package com.farmhustle.farmhustle_backend.dto;

import com.farmhustle.farmhustle_backend.entity.OfferActor;

import java.time.LocalDateTime;

public record OfferHistoryEntry(
        OfferActor actor,
        Double amount,
        LocalDateTime createdAt
) {}
