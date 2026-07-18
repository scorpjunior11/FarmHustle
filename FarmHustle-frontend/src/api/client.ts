const BASE_URL = "https://farmhustle.onrender.com";

// ─── Auth token attachment ─────────────────────────────────
// Module-level so every call in this file can see the latest token without
// threading it through every function signature. Set on startup load and on
// login/signup/logout via AuthContext.

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return fetch(url, { ...options, headers });
}

export type Product = {
  id: string;
  name: string;
  category: "GRAINS" | "VEGETABLES" | "FRUITS" | "TUBERS" | "OTHER";
  quantityAvailable: number;
  unit: "KG" | "BAG" | "CRATE" | "BUNCH";
  price: number;
  description: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  farmer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "FARMER" | "BUYER" | "TRANSPORT_PROVIDER";
    city: string;
    profilePhotoUrl: string | null;
    isActive: boolean;
    createdAt: string;
  };
};

export async function getProducts(): Promise<Product[]> {
  const response = await authFetch(`${BASE_URL}/api/products`);
  const data = await response.json();
  return data;
}

export async function getActiveProducts(): Promise<Product[]> {
  const response = await authFetch(`${BASE_URL}/api/products/active`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product[]>;
}

export async function deactivateProduct(productId: string): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/api/products/${productId}/deactivate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}

export async function reactivateProduct(productId: string): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/api/products/${productId}/reactivate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}

export async function updateProductDetails(
  productId: string,
  data: { price: number; quantityAvailable: number }
): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/api/products/${productId}/details`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: data.price, quantityAvailable: data.quantityAvailable }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}

export async function deleteProduct(productId: string): Promise<void> {
  const response = await authFetch(`${BASE_URL}/api/products/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
}

export async function createProduct(data: {
  name: string;
  category: string;
  quantityAvailable: number;
  unit: string;
  price: number;
  farmerId: string;
  description?: string;
  imageUrl?: string;
}): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      category: data.category,
      quantityAvailable: data.quantityAvailable,
      unit: data.unit,
      price: data.price,
      description: data.description,
      imageUrl: data.imageUrl,
      farmer: { id: data.farmerId },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}

export async function createOrder(data: {
  buyerId: string;
  farmerId: string;
  productId: string;
  quantity: number;
  initialPrice: number;
}): Promise<unknown> {
  const response = await authFetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: { id: data.buyerId },
      farmer: { id: data.farmerId },
      product: { id: data.productId },
      quantity: data.quantity,
      initialPrice: data.initialPrice,
      platformCommissionRate: 0.05,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json();
}

export type OrderStatus =
  | "PENDING"
  | "NEGOTIATING"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "AWAITING_TRANSPORT"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type Order = {
  id: string;
  buyer: AuthUser;
  farmer: AuthUser;
  product: Product;
  quantity: number;
  initialPrice: number;
  agreedPrice: number | null;
  platformCommissionRate: number;
  platformCommissionAmount: number | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export async function getOrdersByBuyer(buyerId: string): Promise<Order[]> {
  const response = await authFetch(`${BASE_URL}/api/orders/buyer/${buyerId}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Order[]>;
}

// An order counts as "active" (blocks re-ordering the same product) unless
// it's reached a terminal state. Single source of truth shared by every
// screen that needs to know which products a buyer already has an open
// order for, so the set of "active" statuses can't drift between them.
const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(["COMPLETED", "CANCELLED"]);

export async function getActiveOrderProductIds(buyerId: string): Promise<Set<string>> {
  const orders = await getOrdersByBuyer(buyerId);
  const ids = orders
    .filter((o) => !TERMINAL_ORDER_STATUSES.has(o.status))
    .map((o) => o.product?.id)
    .filter((id): id is string => !!id);
  return new Set(ids);
}

export async function getOrdersByFarmer(farmerId: string): Promise<Order[]> {
  const response = await authFetch(`${BASE_URL}/api/orders/farmer/${farmerId}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Order[]>;
}

export async function requestDelivery(data: {
  orderId: string;
  pickupLocation: string;
  deliveryLocation: string;
}): Promise<unknown> {
  const response = await authFetch(`${BASE_URL}/api/deliveries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order: { id: data.orderId },
      pickupLocation: data.pickupLocation,
      deliveryLocation: data.deliveryLocation,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json();
}

export type DeliveryStatus =
  | "REQUESTED"
  | "FEE_PROPOSED"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DECLINED";

export type Delivery = {
  id: string;
  status: DeliveryStatus;
  pickupLocation: string | null;
  deliveryLocation: string | null;
  deliveryFee: number | null;
  commissionAmount: number | null;
  provider: AuthUser | null;
  order: Order | null;
  providerConfirmed: boolean;
  buyerConfirmed: boolean;
  feePaid: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getDeliveries(): Promise<Delivery[]> {
  const response = await authFetch(`${BASE_URL}/api/deliveries`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery[]>;
}

export async function acceptDelivery(
  deliveryId: string,
  providerId: string,
  deliveryFee: number,
  commissionAmount: number
): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/accept`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId, deliveryFee, commissionAmount }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function updateDeliveryStatus(deliveryId: string, status: string): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function cancelDelivery(deliveryId: string): Promise<Delivery> {
  return updateDeliveryStatus(deliveryId, "DECLINED");
}

export async function acceptDeliveryFee(deliveryId: string): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/accept-fee`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function declineDeliveryFee(deliveryId: string): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/decline-fee`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function confirmDeliveryByProvider(deliveryId: string): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/confirm-provider`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function confirmDeliveryByBuyer(deliveryId: string): Promise<Delivery> {
  const response = await authFetch(`${BASE_URL}/api/deliveries/${deliveryId}/confirm-buyer`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const response = await authFetch(`${BASE_URL}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Order>;
}

// ─── Payments ───────────────────────────────────────────────

export async function initializePayment(
  orderId: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const response = await authFetch(`${BASE_URL}/api/payments/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<{ authorizationUrl: string; reference: string }>;
}

export async function verifyPayment(
  reference: string
): Promise<{ status: string; order: Order | null }> {
  const response = await authFetch(`${BASE_URL}/api/payments/verify/${reference}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<{ status: string; order: Order | null }>;
}

export async function initializeDeliveryPayment(
  deliveryId: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const response = await authFetch(`${BASE_URL}/api/payments/delivery/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deliveryId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<{ authorizationUrl: string; reference: string }>;
}

export async function verifyDeliveryPayment(
  reference: string
): Promise<{ status: string; delivery: Delivery | null }> {
  const response = await authFetch(`${BASE_URL}/api/payments/delivery/verify/${reference}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<{ status: string; delivery: Delivery | null }>;
}

// ─── Auth ───────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "FARMER" | "BUYER" | "TRANSPORT_PROVIDER";
  city: string;
  profilePhotoUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

export async function updateProfilePhoto(userId: string, profilePhotoUrl: string): Promise<AuthUser> {
  const response = await authFetch(`${BASE_URL}/api/users/${userId}/photo`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profilePhotoUrl }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<AuthUser>;
}

export type AuthResponse = { token: string; user: AuthUser };
export type SignupResponse = { message: string; email: string };

// Thrown by login() when the backend rejects with 403 EMAIL_NOT_VERIFIED, so
// callers can distinguish "needs verification" from a normal bad-credentials
// error without parsing message strings.
export class EmailNotVerifiedError extends Error {
  email: string;

  constructor(email: string, message: string) {
    super(message);
    this.name = "EmailNotVerifiedError";
    this.email = email;
  }
}

export async function signup(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  city: string;
}): Promise<SignupResponse> {
  const response = await authFetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Signup failed");
  }

  return response.json() as Promise<SignupResponse>;
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  const response = await authFetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; email?: string }
        | null;
      if (body?.error === "EMAIL_NOT_VERIFIED") {
        throw new EmailNotVerifiedError(
          body.email ?? data.email,
          body.message || "Please verify your email before logging in."
        );
      }
      throw new Error(body?.message || "Login failed");
    }
    const message = await response.text();
    throw new Error(message || "Login failed");
  }

  return response.json() as Promise<AuthResponse>;
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  const response = await authFetch(`${BASE_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Invalid or expired code");
  }

  return response.json() as Promise<AuthResponse>;
}

export async function resendVerification(email: string): Promise<SignupResponse> {
  const response = await authFetch(`${BASE_URL}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not resend the code");
  }

  return response.json() as Promise<SignupResponse>;
}
