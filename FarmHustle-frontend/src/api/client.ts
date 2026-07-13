const BASE_URL = "http://192.168.2.95:8080";

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
  const response = await fetch(`${BASE_URL}/api/products`);
  const data = await response.json();
  return data;
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
  const response = await fetch(`${BASE_URL}/api/products`, {
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
  const response = await fetch(`${BASE_URL}/api/orders`, {
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
  const response = await fetch(`${BASE_URL}/api/orders/buyer/${buyerId}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Order[]>;
}

export async function getOrdersByFarmer(farmerId: string): Promise<Order[]> {
  const response = await fetch(`${BASE_URL}/api/orders/farmer/${farmerId}`);
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
  const response = await fetch(`${BASE_URL}/api/deliveries`, {
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
  order: {
    id: string;
    quantity: number;
    buyer?: { name: string } | null;
    product?: { name: string; unit: string } | null;
  } | null;
  providerConfirmed: boolean;
  buyerConfirmed: boolean;
  feePaid: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getDeliveries(): Promise<Delivery[]> {
  const response = await fetch(`${BASE_URL}/api/deliveries`);
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
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/accept`, {
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
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/status`, {
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
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/accept-fee`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function declineDeliveryFee(deliveryId: string): Promise<Delivery> {
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/decline-fee`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function confirmDeliveryByProvider(deliveryId: string): Promise<Delivery> {
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/confirm-provider`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function confirmDeliveryByBuyer(deliveryId: string): Promise<Delivery> {
  const response = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/confirm-buyer`, {
    method: "PATCH",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Delivery>;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const response = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
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
  const response = await fetch(`${BASE_URL}/api/payments/initialize`, {
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
  const response = await fetch(`${BASE_URL}/api/payments/verify/${reference}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<{ status: string; order: Order | null }>;
}

export async function initializeDeliveryPayment(
  deliveryId: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const response = await fetch(`${BASE_URL}/api/payments/delivery/initialize`, {
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
  const response = await fetch(`${BASE_URL}/api/payments/delivery/verify/${reference}`);
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
  const response = await fetch(`${BASE_URL}/api/users/${userId}/photo`, {
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

export async function signup(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  city: string;
}): Promise<AuthUser> {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Signup failed");
  }

  return response.json() as Promise<AuthUser>;
}

export async function login(data: { email: string; password: string }): Promise<AuthUser> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Login failed");
  }

  return response.json() as Promise<AuthUser>;
}
