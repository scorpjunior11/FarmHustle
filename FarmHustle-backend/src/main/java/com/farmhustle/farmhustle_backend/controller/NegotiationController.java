package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.DeliveryOffer;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
import com.farmhustle.farmhustle_backend.service.NegotiationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/negotiation")
public class NegotiationController {

    private final NegotiationService negotiationService;

    public NegotiationController(NegotiationService negotiationService) {
        this.negotiationService = negotiationService;
    }

    @PostMapping("/requests/{requestId}/offers")
    public ResponseEntity<?> proposeOffer(@PathVariable UUID requestId, @RequestBody AmountRequest body) {
        try {
            DeliveryOffer offer = negotiationService.proposeOffer(requestId, CurrentUser.id(), body.amount());
            return ResponseEntity.status(HttpStatus.CREATED).body(offer);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/requests/{requestId}/offers/accept")
    public ResponseEntity<?> acceptBuyerPrice(@PathVariable UUID requestId) {
        try {
            return ResponseEntity.ok(negotiationService.acceptBuyerPrice(requestId, CurrentUser.id()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/offers/{offerId}/counter")
    public ResponseEntity<?> counterOffer(@PathVariable UUID offerId, @RequestBody AmountRequest body) {
        try {
            DeliveryOffer offer = negotiationService.getOfferById(offerId);
            if (!offer.getDriver().getId().equals(CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This offer does not belong to you.");
            }
            return ResponseEntity.ok(negotiationService.counterOffer(offerId, body.amount()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/offers/{offerId}/decline")
    public ResponseEntity<?> declineOffer(@PathVariable UUID offerId) {
        try {
            DeliveryOffer offer = negotiationService.getOfferById(offerId);
            if (!offer.getDriver().getId().equals(CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("This offer does not belong to you.");
            }
            return ResponseEntity.ok(negotiationService.declineOffer(offerId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/requests/{requestId}/offers")
    public ResponseEntity<?> getOffersForBuyer(@PathVariable UUID requestId) {
        try {
            Delivery request = negotiationService.getRequestById(requestId);
            if (!isBuyerOfRequest(request, CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this transport request.");
            }
            return ResponseEntity.ok(negotiationService.getOffersForRequest(requestId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/offers/{offerId}/counter-buyer")
    public ResponseEntity<?> counterOfferAsBuyer(@PathVariable UUID offerId, @RequestBody AmountRequest body) {
        try {
            DeliveryOffer offer = negotiationService.getOfferById(offerId);
            if (!isBuyerOfRequest(offer.getRequest(), CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this transport request.");
            }
            return ResponseEntity.ok(negotiationService.counterOfferAsBuyer(offerId, body.amount()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/offers/{offerId}/accept")
    public ResponseEntity<?> acceptOffer(@PathVariable UUID offerId) {
        try {
            DeliveryOffer offer = negotiationService.getOfferById(offerId);
            if (!isBuyerOfRequest(offer.getRequest(), CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this transport request.");
            }
            return ResponseEntity.ok(negotiationService.acceptOffer(offerId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/offers/mine")
    public ResponseEntity<?> getMyOffers() {
        try {
            return ResponseEntity.ok(negotiationService.getMyOffers(CurrentUser.id()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/offers/{offerId}/history")
    public ResponseEntity<?> getOfferHistory(@PathVariable UUID offerId) {
        try {
            DeliveryOffer offer = negotiationService.getOfferById(offerId);
            if (!isBuyerOfRequest(offer.getRequest(), CurrentUser.id())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not own this transport request.");
            }
            return ResponseEntity.ok(negotiationService.getOfferHistory(offerId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Buyer ownership is walked offer -> request -> order -> buyer. Standalone
    // requests (no linked order) have no buyer to compare against, so they're
    // never accessible via this path — a safe default, not a bug.
    private boolean isBuyerOfRequest(Delivery request, UUID callerId) {
        return request.getOrder() != null
                && request.getOrder().getBuyer() != null
                && callerId.equals(request.getOrder().getBuyer().getId());
    }

    private record AmountRequest(Double amount) {}
}
