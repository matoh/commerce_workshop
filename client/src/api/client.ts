import type {
  Product,
  Sale,
  SellInput,
  ReserveInput,
  BulkPriceUpdateInput,
  BulkPriceJob,
  Reservation,
  HealthResponse,
} from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),

  getProducts: () => request<Product[]>('/products'),

  getProduct: (id: number) => request<Product>(`/products/${id}`),

  sell: (productId: number, input: SellInput) =>
    request<Sale>(`/products/${productId}/sell`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  sellOptimistic: (productId: number, input: SellInput) =>
    request<Sale>(`/products/${productId}/sell-optimistic`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  reserve: (productId: number, input: ReserveInput) =>
    request<Reservation>(`/products/${productId}/reserve`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getActiveReservations: () => request<Reservation[]>('/reservations'),

  completeReservation: (reservationId: number) =>
    request<Sale>(`/reservations/${reservationId}/complete`, {
      method: 'POST',
    }),

  cancelReservation: (reservationId: number) =>
    request<Reservation>(`/reservations/${reservationId}/cancel`, {
      method: 'POST',
    }),

  bulkPriceUpdate: (input: BulkPriceUpdateInput) =>
    request<{ jobId: number; completedItems: number; failedItems: number }>(
      '/products/bulk-price',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  getBulkPriceJob: (jobId: number) =>
    request<BulkPriceJob>(`/products/bulk-price/${jobId}`),
};
