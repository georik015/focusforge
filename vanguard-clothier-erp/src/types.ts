export type Role = 'ADMIN' | 'SELLER' | 'STOREKEEPER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  warehouseId?: string;
  warehouse?: Warehouse;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  isMain: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cardId?: string;
  loyaltyPoints: number;
  totalSpent: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  lowStockThreshold: number;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  categoryId: string;
  category: Category;
  brandId: string;
  brand: Brand;
  variations: ProductVariation[];
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variationId: string;
  variation: ProductVariation;
  quantity: number;
  priceAtSale: number;
}

export interface Sale {
  id: string;
  totalAmount: number;
  discount: number;
  paymentType: 'CASH' | 'CARD' | 'MIXED' | 'LOYALTY';
  sellerId: string;
  seller: User;
  customerId?: string;
  customer?: Customer;
  items: SaleItem[];
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  lowStockCount: number;
  lowStockItems: ProductVariation[];
  recentActivity: any[];
  topProducts: any[];
  salesByDay: { date: string, amount: number }[];
}
