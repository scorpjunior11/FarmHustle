const BASE_URL = "http://192.168.2.95:8080";

export type Product = {
  id: string;
  name: string;
  category: "GRAINS" | "VEGETABLES" | "FRUITS" | "TUBERS" | "OTHER";
  quantityAvailable: number;
  unit: "KG" | "BAG" | "CRATE" | "BUNCH";
  price: number;
  description: string | null;
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

// TEMPORARY: hardcoded farmer id until real auth exists. Replace before submission. See PROGRESS.md.
export const TEMP_TEST_FARMER_ID = "be65f2b6-6a10-43a5-8da5-5e267fe071f7";

export async function createProduct(data: {
  name: string;
  category: string;
  quantityAvailable: number;
  unit: string;
  price: number;
  farmerId: string;
  description?: string;
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
      farmer: { id: data.farmerId },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}

// TEMPORARY: hardcoded buyer id until logged-in user is tracked. Replace before submission. See PROGRESS.md.
export const TEMP_TEST_BUYER_ID = "be65f2b6-6a10-43a5-8da5-5e267fe071f7";

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
