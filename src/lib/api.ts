import type {
  ApiKeyItem,
  AuthUser,
  CustomerItem,
  DriverInfo,
  DriverStatItem,
  InboxMessageItem,
  ShipmentItem,
  ShipmentStatus,
} from '../types';

// Keep Bearer session token strictly in JS memory (never localStorage/sessionStorage)
let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (memoryToken) {
    headers.Authorization = `Bearer ${memoryToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  health: () =>
    request<{
      ok: boolean;
      storage: 'postgres' | 'memory';
      mapsConfigured: boolean;
      realtime: string;
      docsUrl: string;
    }>('/api/health'),

  authStatus: () => request<{ hasUsers: boolean; storage: 'postgres' | 'memory' }>('/api/auth/status'),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    title?: string;
    organization?: string;
  }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<{ user: AuthUser }>('/api/auth/me'),

  getApiKeys: () =>
    request<{ keys: ApiKeyItem[]; envKeyConfigured: boolean }>('/api/keys'),

  createApiKey: (name: string) =>
    request<{ apiKey: ApiKeyItem; rawKey: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeApiKey: (id: number) =>
    request<{ ok: boolean }>(`/api/keys/${id}`, {
      method: 'DELETE',
    }),

  getShipments: (params?: { q?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    const qs = search.toString();
    return request<{ shipments: ShipmentItem[] }>(`/api/shipments${qs ? `?${qs}` : ''}`);
  },

  createShipment: (payload: {
    orderCode: string;
    trackingRef: string;
    status: ShipmentStatus;
    originCode: string;
    originCity: string;
    originTime: string;
    destCode: string;
    destCity: string;
    destTime: string;
    progressPct: number;
    dropoffEta: string;
    dropoffLocation: string;
    dropoffTag: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
  }) =>
    request<{ shipment: ShipmentItem }>('/api/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateShipment: (
    id: number,
    payload: {
      status?: ShipmentStatus;
      progressPct?: number;
      dropoffEta?: string;
      dropoffLocation?: string;
    }
  ) =>
    request<{ shipment: ShipmentItem }>(`/api/shipments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteShipment: (id: number) =>
    request<{ ok: boolean }>(`/api/shipments/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => request<{ stats: DriverStatItem[] }>('/api/stats'),

  getDrivers: () => request<{ drivers: DriverInfo[] }>('/api/drivers'),

  getCustomers: () => request<{ customers: CustomerItem[] }>('/api/customers'),

  getInbox: () => request<{ messages: InboxMessageItem[] }>('/api/inbox'),

  markMessageRead: (id: number) =>
    request<{ message: InboxMessageItem }>(`/api/inbox/${id}/read`, {
      method: 'PATCH',
    }),
};
