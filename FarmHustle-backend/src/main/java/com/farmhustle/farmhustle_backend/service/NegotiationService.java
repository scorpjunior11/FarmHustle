package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.dto.OfferHistoryEntry;
import com.farmhustle.farmhustle_backend.dto.OfferSummaryResponse;
import com.farmhustle.farmhustle_backend.entity.Delivery;
import com.farmhustle.farmhustle_backend.entity.DeliveryOffer;
import com.farmhustle.farmhustle_backend.entity.OfferActor;
import com.farmhustle.farmhustle_backend.entity.OfferCounter;
import com.farmhustle.farmhustle_backend.entity.OfferStatus;
import com.farmhustle.farmhustle_backend.entity.Role;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.repository.DeliveryOfferRepository;
import com.farmhustle.farmhustle_backend.repository.DeliveryRepository;
import com.farmhustle.farmhustle_backend.repository.OfferCounterRepository;
import com.farmhustle.farmhustle_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

// Multi-driver fee negotiation. A separate, parallel path that writes to
// delivery_offers/offer_counters and never touches Delivery.status/
// TransportStatus/ALLOWED_TRANSITIONS directly — the one exception is
// acceptOffer(), which reproduces the old flow's end state by calling
// DeliveryService's own validated acceptDelivery()/acceptFee() methods
// unmodified, rather than setting TransportStatus itself.
@Service
public class NegotiationService {

    private final DeliveryOfferRepository deliveryOfferRepository;
    private final OfferCounterRepository offerCounterRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final DeliveryService deliveryService;
    private final boolean negotiationEnabled;

    public NegotiationService(DeliveryOfferRepository deliveryOfferRepository,
                               OfferCounterRepository offerCounterRepository,
                               DeliveryRepository deliveryRepository,
                               UserRepository userRepository,
                               DeliveryService deliveryService,
                               @Value("${negotiation.enabled:false}") boolean negotiationEnabled) {
        this.deliveryOfferRepository = deliveryOfferRepository;
        this.offerCounterRepository = offerCounterRepository;
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.deliveryService = deliveryService;
        this.negotiationEnabled = negotiationEnabled;
    }

    @Transactional
    public DeliveryOffer proposeOffer(UUID requestId, UUID driverId, Double amount) {
        requireNegotiationEnabled();
        validateAmount(amount);
        Delivery request = getRequestById(requestId);
        User driver = getTransportProvider(driverId);

        if (deliveryOfferRepository.findByRequestIdAndDriverId(requestId, driverId).isPresent()) {
            throw new IllegalStateException(
                    "You already have an offer on this request — counter it instead of proposing a new one.");
        }

        LocalDateTime now = LocalDateTime.now();
        DeliveryOffer offer = new DeliveryOffer();
        offer.setRequest(request);
        offer.setDriver(driver);
        offer.setCurrentAmount(amount);
        offer.setLastActor(OfferActor.DRIVER);
        offer.setStatus(OfferStatus.PENDING);
        offer.setCreatedAt(now);
        offer.setUpdatedAt(now);
        offer = deliveryOfferRepository.save(offer);

        // Seed the buyer's opening price as the first row in the history (dated at
        // the request's own creation time) so the trail reads buyer-then-driver.
        seedBuyerOpening(request, offer);
        recordCounter(offer, OfferActor.DRIVER, amount);

        return offer;
    }

    @Transactional
    public DeliveryOffer acceptBuyerPrice(UUID requestId, UUID driverId) {
        requireNegotiationEnabled();
        Delivery request = getRequestById(requestId);
        User driver = getTransportProvider(driverId);

        Optional<DeliveryOffer> existing = deliveryOfferRepository.findByRequestIdAndDriverId(requestId, driverId);
        DeliveryOffer offer;
        Double buyerPrice;

        if (existing.isPresent()) {
            offer = existing.get();
            if (offer.getStatus() != OfferStatus.PENDING) {
                throw new IllegalStateException(
                        "This negotiation is " + offer.getStatus() + " and is no longer open.");
            }
            buyerPrice = latestBuyerAmount(offer).orElse(request.getDeliveryFee());
            if (buyerPrice == null) {
                throw new IllegalStateException("This request has no price to accept yet.");
            }
            offer.setCurrentAmount(buyerPrice);
            offer.setLastActor(OfferActor.DRIVER);
            offer.setUpdatedAt(LocalDateTime.now());
            offer = deliveryOfferRepository.save(offer);
        } else {
            buyerPrice = request.getDeliveryFee();
            if (buyerPrice == null) {
                throw new IllegalStateException("This request has no starting price to accept.");
            }
            LocalDateTime now = LocalDateTime.now();
            offer = new DeliveryOffer();
            offer.setRequest(request);
            offer.setDriver(driver);
            offer.setCurrentAmount(buyerPrice);
            offer.setLastActor(OfferActor.DRIVER);
            offer.setStatus(OfferStatus.PENDING);
            offer.setCreatedAt(now);
            offer.setUpdatedAt(now);
            offer = deliveryOfferRepository.save(offer);
        }

        recordCounter(offer, OfferActor.DRIVER, buyerPrice);
        return offer;
    }

    @Transactional
    public DeliveryOffer counterOffer(UUID offerId, Double amount) {
        return applyCounter(offerId, OfferActor.DRIVER, amount);
    }

    @Transactional
    public DeliveryOffer counterOfferAsBuyer(UUID offerId, Double amount) {
        return applyCounter(offerId, OfferActor.BUYER, amount);
    }

    private DeliveryOffer applyCounter(UUID offerId, OfferActor actor, Double amount) {
        requireNegotiationEnabled();
        validateAmount(amount);
        DeliveryOffer offer = getOfferById(offerId);
        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException(
                    "This offer is " + offer.getStatus() + " and can no longer be countered.");
        }
        offer.setCurrentAmount(amount);
        offer.setLastActor(actor);
        offer.setUpdatedAt(LocalDateTime.now());
        offer = deliveryOfferRepository.save(offer);
        recordCounter(offer, actor, amount);
        return offer;
    }

    @Transactional
    public DeliveryOffer declineOffer(UUID offerId) {
        requireNegotiationEnabled();
        DeliveryOffer offer = getOfferById(offerId);
        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException("This offer is already " + offer.getStatus() + ".");
        }
        offer.setStatus(OfferStatus.DECLINED);
        offer.setUpdatedAt(LocalDateTime.now());
        return deliveryOfferRepository.save(offer);
    }

    // Buyer accepts a driver's offer. Reproduces the old flow's own two-step
    // transition (REQUESTED -> FEE_PROPOSED -> ACCEPTED) by calling
    // DeliveryService's existing, unmodified acceptDelivery()/acceptFee() —
    // same ALLOWED_TRANSITIONS-validated path, same propagateOrderStatus firing
    // on the ACCEPTED step, same end-state fields as an old-flow accept.
    @Transactional
    public DeliveryOffer acceptOffer(UUID offerId) {
        requireNegotiationEnabled();
        DeliveryOffer offer = getOfferById(offerId);
        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new IllegalStateException(
                    "This offer is " + offer.getStatus() + " and can no longer be accepted.");
        }

        UUID requestId = offer.getRequest().getId();
        UUID driverId = offer.getDriver().getId();
        Double agreedAmount = offer.getCurrentAmount();

        // Close every other still-open negotiation on this request — the buyer has chosen.
        for (DeliveryOffer sibling : deliveryOfferRepository.findByRequestIdOrderByCreatedAtDesc(requestId)) {
            if (!sibling.getId().equals(offerId) && sibling.getStatus() == OfferStatus.PENDING) {
                sibling.setStatus(OfferStatus.CLOSED);
                sibling.setUpdatedAt(LocalDateTime.now());
                deliveryOfferRepository.save(sibling);
            }
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offer.setUpdatedAt(LocalDateTime.now());
        offer = deliveryOfferRepository.save(offer);

        // commissionAmount has no negotiation-table equivalent — matching the old
        // flow's own 10% convention (hardcoded client-side today) for consistency.
        // Not read by PaymentService/OrderService/frontend earnings math — cosmetic only.
        deliveryService.acceptDelivery(requestId, driverId, agreedAmount, agreedAmount * 0.1);
        deliveryService.acceptFee(requestId);

        return offer;
    }

    public DeliveryOffer getOfferById(UUID offerId) {
        return deliveryOfferRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found: " + offerId));
    }

    // Buyer's offer list: cheapest-first, PENDING/ACCEPTED only (declined/closed
    // offers are noise the buyer doesn't need to see). DTO-mapped so the response
    // never carries the driver's full User entity (password hash, etc.).
    public List<OfferSummaryResponse> getOffersForRequest(UUID requestId) {
        requireNegotiationEnabled();
        List<DeliveryOffer> offers = deliveryOfferRepository.findByRequestIdOrderByCreatedAtDesc(requestId);
        return offers.stream()
                .filter(o -> o.getStatus() == OfferStatus.PENDING || o.getStatus() == OfferStatus.ACCEPTED)
                .sorted(Comparator.comparing(DeliveryOffer::getCurrentAmount))
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    public List<OfferHistoryEntry> getOfferHistory(UUID offerId) {
        requireNegotiationEnabled();
        getOfferById(offerId); // 400 if the offer doesn't exist
        return offerCounterRepository.findByOfferIdOrderByCreatedAtAsc(offerId).stream()
                .map(c -> new OfferHistoryEntry(c.getActor(), c.getAmount(), c.getCreatedAt()))
                .collect(Collectors.toList());
    }

    private OfferSummaryResponse toSummary(DeliveryOffer offer) {
        User driver = offer.getDriver();
        return new OfferSummaryResponse(
                offer.getId(),
                driver.getId(),
                driver.getName(),
                driver.getCity(),
                driver.getPhone(),
                offer.getCurrentAmount(),
                offer.getLastActor(),
                offer.getStatus(),
                offer.getUpdatedAt()
        );
    }

    public Delivery getRequestById(UUID requestId) {
        return deliveryRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Transport request not found: " + requestId));
    }

    private User getTransportProvider(UUID driverId) {
        User user = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("User not found: " + driverId));
        if (user.getRole() != Role.TRANSPORT_PROVIDER) {
            throw new IllegalStateException("Only transport providers can negotiate delivery fees.");
        }
        return user;
    }

    private void validateAmount(Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0.");
        }
    }

    private void requireNegotiationEnabled() {
        if (!negotiationEnabled) {
            throw new IllegalStateException("Negotiation is not enabled.");
        }
    }

    private Optional<Double> latestBuyerAmount(DeliveryOffer offer) {
        List<OfferCounter> counters = offerCounterRepository.findByOfferIdOrderByCreatedAtAsc(offer.getId());
        OfferCounter latestBuyerCounter = null;
        for (OfferCounter counter : counters) {
            if (counter.getActor() == OfferActor.BUYER) {
                latestBuyerCounter = counter;
            }
        }
        return Optional.ofNullable(latestBuyerCounter).map(OfferCounter::getAmount);
    }

    private void seedBuyerOpening(Delivery request, DeliveryOffer offer) {
        if (request.getDeliveryFee() == null) {
            return;
        }
        OfferCounter buyerOpening = new OfferCounter();
        buyerOpening.setOffer(offer);
        buyerOpening.setActor(OfferActor.BUYER);
        buyerOpening.setAmount(request.getDeliveryFee());
        buyerOpening.setCreatedAt(request.getCreatedAt());
        offerCounterRepository.save(buyerOpening);
    }

    private void recordCounter(DeliveryOffer offer, OfferActor actor, Double amount) {
        OfferCounter counter = new OfferCounter();
        counter.setOffer(offer);
        counter.setActor(actor);
        counter.setAmount(amount);
        counter.setCreatedAt(LocalDateTime.now());
        offerCounterRepository.save(counter);
    }
}
