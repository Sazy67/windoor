import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401 auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  brand: string;
  isEndOfLife: boolean;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  color?: string;
  dimension: string;
  type?: string;
  material?: string;
  salePrice: number;
  minimumStockLevel: number;
  sku: string;
  stock?: Stock;
  product?: Product;
}

export interface Stock {
  id: string;
  variantId: string;
  quantity: number;
  secondQualityQty: number;
  lastUpdated: string;
}

export interface StockItem {
  id: string;
  sku: string;
  productName: string;
  productCategory: string;
  brand: string;
  color?: string;
  dimension: string;
  type?: string;
  material?: string;
  quantity: number;
  secondQualityQty: number;
  minimumStockLevel: number;
  status: 'Normal' | 'Low' | 'Out_Of_Stock' | 'Discontinued';
  lastUpdated?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Sale {
  id: string;
  customerId: string;
  customer?: Customer;
  saleDate: string;
  totalAmount: number;
  notes?: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderType: 'Custom' | 'Reservation';
  customerId: string;
  customer?: Customer;
  orderDate: string;
  status: string;
  notes?: string;
  customOrder?: CustomOrder;
  reservationOrder?: ReservationOrder;
}

export interface CustomOrder {
  id: string;
  orderId: string;
  productType: string;
  dimensions: string;
  specifications?: string;
  deliveryDeadline: string;
  status: string;
}

export interface ReservationOrder {
  id: string;
  orderId: string;
  status: string;
  items?: ReservationOrderItem[];
}

export interface ReservationOrderItem {
  id: string;
  reservationOrderId: string;
  variantId: string;
  variant?: ProductVariant;
  quantity: number;
}

// API Functions
export const userApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/users/login', { username, password }),
  getUsers: () => api.get<User[]>('/users'),
  createUser: (data: { username: string; displayName: string; password: string; role: string }) =>
    api.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User & { password?: string }>) =>
    api.put<User>(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const customerApi = {
  getCustomers: () => api.get<Customer[]>('/customers'),
  createCustomer: (data: Partial<Customer>) => api.post<Customer>('/customers', data),
  updateCustomer: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),
};

export const productApi = {
  getProducts: (params?: any) => api.get<Product[]>('/products', { params }),
  getProduct: (id: string) => api.get<Product>(`/products/${id}`),
  createProduct: (data: any) => api.post<Product>('/products', data),
  updateProduct: (id: string, data: any) => api.put<Product>(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  createVariant: (productId: string, data: any) => api.post<ProductVariant>(`/products/${productId}/variants`, data),
  updateVariant: (id: string, data: any) => api.put<ProductVariant>(`/variants/${id}`, data),
  deleteVariant: (id: string) => api.delete(`/variants/${id}`),
};

export const stockApi = {
  getStock: (params?: any) => api.get<StockItem[]>('/stock', { params }),
  getStockByVariant: (variantId: string) => api.get<StockItem>(`/stock/${variantId}`),
  getCriticalStock: () => api.get<StockItem[]>('/stock/critical'),
  createEntry: (data: any) => api.post('/stock/entry', data),
  createExit: (data: any) => api.post('/stock/exit', data),
  deleteEntry: (id: string) => api.delete(`/stock/entry/${id}`),
  deleteExit: (id: string) => api.delete(`/stock/exit/${id}`),
};

export const salesApi = {
  getSales: (params?: any) => api.get<Sale[]>('/sales', { params }),
  getSale: (id: string) => api.get<Sale>(`/sales/${id}`),
  createSale: (data: any) => api.post<Sale>('/sales', data),
};

export const orderApi = {
  getOrders: (params?: any) => api.get<Order[]>('/orders', { params }),
  getOrder: (id: string) => api.get<Order>(`/orders/${id}`),
  createCustomOrder: (data: any) => api.post<Order>('/orders/custom', data),
  createReservationOrder: (data: any) => api.post<Order>('/orders/reservation', data),
  updateOrderStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
  deliverReservation: (id: string, data: { createdById: string; notes?: string }) =>
    api.post(`/orders/${id}/deliver`, data),
};

export const reportApi = {
  getBestSelling: (params?: any) => api.get('/reports/best-selling', { params }),
  getSlowMoving: (params?: any) => api.get('/reports/slow-moving', { params }),
  getMonthlySales: (params?: any) => api.get('/reports/monthly-sales', { params }),
  getStockValue: () => api.get('/reports/stock-value'),
  getRecentSales: (limit?: number) => api.get('/reports/recent-sales', { params: { limit } }),
  getDashboardSummary: () => api.get('/reports/dashboard-summary'),
  getVariantMovements: (variantId: string) => api.get(`/reports/variant-movements/${variantId}`),
  getCustomerHistory: (customerId: string) => api.get(`/reports/customer-history/${customerId}`),
};
