/**
 * Admin-authenticated TastyIgniter API client.
 * Token is read from localStorage on every request so it stays fresh
 * across tab reloads without needing a React provider.
 */
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'cd_admin_token';
const USER_KEY  = 'cd_admin_user';

function createAdminApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_TI_API_URL ?? 'http://localhost:8000/api',
    headers: { Accept: 'application/json' },
    timeout: 15_000,
  });

  // Attach Bearer token from localStorage on every outgoing request.
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // TastyIgniter's REST API returns JSON:API shaped payloads:
  //   { data: [{ type, id, attributes: { ...fields } }, ...] }
  //   { data:  { type, id, attributes: { ...fields } } }
  // The SPA pages were written assuming flat objects (item.menu_id,
  // item.menu_name, etc). Flatten { id, ...attributes } here so every
  // consumer sees clean objects without per-page mapping.
  // English-plural → singular helper for TI's `{type}_id` convention.
  // Handles the common irregulars TI ships: categories → category,
  // currencies → currency, deliveries → delivery, taxonomies → taxonomy.
  function singularizeType(t: string): string {
    if (t.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (t.endsWith('ses') || t.endsWith('xes') || t.endsWith('zes')) return t.slice(0, -2);
    if (t.endsWith('s')) return t.slice(0, -1);
    return t;
  }

  function flattenJsonApi<T = unknown>(node: unknown): T | unknown {
    if (Array.isArray(node)) return node.map(flattenJsonApi) as unknown as T;
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (
        'attributes' in obj &&
        obj.attributes &&
        typeof obj.attributes === 'object'
      ) {
        const flat: Record<string, unknown> = {
          id: obj.id,
          ...(obj.attributes as Record<string, unknown>),
        };
        // TI convention: legacy pages expect `${singular_type}_id`
        // (menu_id, location_id, category_id, order_id, etc.) alongside
        // the JSON:API root `id`. Expose both for compatibility.
        if (typeof obj.type === 'string') {
          const key = `${singularizeType(obj.type)}_id`;
          // Don't clobber if `attributes` already includes the prefixed id
          // (some TI resources do put it there).
          if (!(key in flat)) flat[key] = obj.id;
        }
        return flat as T;
      }
    }
    return node as T;
  }

  // SECURITY: If the server returns 401, the stored token has been revoked or
  // has expired. Clear all admin credentials immediately so the user is
  // redirected to the login page rather than continuing with a stale token.
  instance.interceptors.response.use(
    (response) => {
      // Only touch payloads that look like JSON:API (have a top-level `data`
      // whose elements carry `attributes`). Leave everything else untouched
      // so non-TI endpoints (our /admin/auth, /dashboard/stats stubs, etc.)
      // pass through unchanged.
      const body = response.data;
      if (body && typeof body === 'object' && 'data' in body) {
        const d = (body as { data: unknown }).data;
        const looksJsonApi =
          (Array.isArray(d) && d.some((it) => it && typeof it === 'object' && 'attributes' in (it as object))) ||
          (d && typeof d === 'object' && 'attributes' in (d as object));
        if (looksJsonApi) {
          (body as { data: unknown }).data = flattenJsonApi(d);
        }
      }
      return response;
    },
    (error) => {
      if (error?.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Redirect to login — works in both hash and history routers.
        if (typeof window !== 'undefined') {
          window.location.replace('/admin/login');
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export const adminApi = createAdminApi();

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => adminApi.get('/dashboard/stats'),
  recentOrders: (limit = 10) => adminApi.get('/orders', { params: { pageLimit: limit, sort: 'created_at desc' } }),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersApi = {
  list:       (params?: object) => adminApi.get('/orders', { params }),
  get:        (id: number) => adminApi.get(`/orders/${id}`),
  updateStatus: (id: number, statusId: number) =>
    adminApi.put(`/orders/${id}`, { status_id: statusId }),
};

// ─── Menu items ───────────────────────────────────────────────────────────────
export const menuItemsApi = {
  list:   (params?: object) => adminApi.get('/menus', { params: { pageLimit: 200, ...params } }),
  get:    (id: number) => adminApi.get(`/menus/${id}`),
  create: (data: object) => adminApi.post('/menus', data),
  update: (id: number, data: object) => adminApi.put(`/menus/${id}`, data),
  delete: (id: number) => adminApi.delete(`/menus/${id}`),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  list:   () => adminApi.get('/categories', { params: { pageLimit: 100 } }),
  create: (data: object) => adminApi.post('/categories', data),
  update: (id: number, data: object) => adminApi.put(`/categories/${id}`, data),
  delete: (id: number) => adminApi.delete(`/categories/${id}`),
};

// ─── Locations ────────────────────────────────────────────────────────────────
export const locationsApi = {
  list:   () => adminApi.get('/locations', { params: { pageLimit: 50 } }),
  get:    (id: number) => adminApi.get(`/locations/${id}`),
  update: (id: number, data: object) => adminApi.put(`/locations/${id}`, data),
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcementsApi = {
  list:   () => adminApi.get('/announcements', { params: { pageLimit: 50 } }),
  create: (data: object) => adminApi.post('/announcements', data),
  update: (id: number, data: object) => adminApi.put(`/announcements/${id}`, data),
  delete: (id: number) => adminApi.delete(`/announcements/${id}`),
};

// ─── Reservations ─────────────────────────────────────────────────────────────
export const reservationsApi = {
  list: (params?: object) => adminApi.get('/reservations', { params: { pageLimit: 50, ...params } }),
  update: (id: number, data: object) => adminApi.put(`/reservations/${id}`, data),
};

// ─── Order statuses ───────────────────────────────────────────────────────────
export const statusesApi = {
  list:   () => adminApi.get('/statuses', { params: { status_for: 'order', pageLimit: 20 } }),
  update: (id: number, data: object) => adminApi.put(`/statuses/${id}`, data),
};

// ─── Prep times (CD extension) ────────────────────────────────────────────────
export const prepTimesApi = {
  list:   () => adminApi.get('/cd/prep-times'),
  update: (menuId: number, minutes: number) =>
    adminApi.put(`/cd/prep-times/${menuId}`, { prep_time_minutes: minutes }),
};

// ─── Custom CD settings (CD extension) ───────────────────────────────────────
export const cdSettingsApi = {
  list:   () => adminApi.get('/cd/settings'),
  set:    (key: string, value: unknown) => adminApi.put(`/cd/settings/${key}`, { value }),
  setMany: (pairs: Record<string, unknown>) => adminApi.put('/cd/settings', { settings: pairs }),
};
