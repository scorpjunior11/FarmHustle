const BASE_URL = "http://192.168.2.95:8080";

export type Product = {
  id: string;
  name: string;
  category: "GRAINS" | "VEGETABLES" | "FRUITS" | "TUBERS" | "OTHER";
  quantityAvailable: number;
  unit: "KG" | "BAG" | "CRATE" | "BUNCH";
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
    region: string;
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
      description: data.description,
      farmer: { id: TEMP_TEST_FARMER_ID },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  return response.json() as Promise<Product>;
}
