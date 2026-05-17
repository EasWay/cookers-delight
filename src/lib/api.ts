import axios from 'axios';
import type {
  ApiResponse,
  TIMenuItem,
  TICategory,
  TILocation,
  TIReservation,
  TIAnnouncement,
  ReservationInput,
} from '../types';

// Defaults to relative paths so the Vite dev proxy (vite.config.ts) can route
// /api and /v1 to TastyIgniter without triggering CORS. Override with
// VITE_TI_API_URL in production.
const api = axios.create({
  baseURL: import.meta.env.VITE_TI_API_URL ?? '/api',
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_TI_API_TOKEN ?? ''}`,
    Accept: 'application/json',
  },
  timeout: 10_000,
});

// ─── Menu ────────────────────────────────────────────────────────────────────

export const menuApi = {
  getItems: (locationId?: number) =>
    api.get<ApiResponse<TIMenuItem[]>>('/menus', {
      params: { location: locationId, enabled: true, pageLimit: 100 },
    }),

  getCategories: (locationId?: number) =>
    api.get<ApiResponse<TICategory[]>>('/categories', {
      params: { location: locationId, status: true },
    }),
};

// ─── Locations ───────────────────────────────────────────────────────────────

export const locationApi = {
  list: () => api.get<ApiResponse<TILocation[]>>('/locations', { params: { status: true } }),
  get:  (id: number) => api.get<ApiResponse<TILocation>>(`/locations/${id}`),
};

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservationApi = {
  create: (data: ReservationInput) =>
    api.post<ApiResponse<TIReservation>>('/reservations', data),

  getSlots: (params: { date: string; guests: number; location_id: number }) =>
    api.get<ApiResponse<string[]>>('/reservations/timeslots', { params }),
};

// ─── Prep times ───────────────────────────────────────────────────────────────

export const prepTimeApi = {
  // Trick 08 — versioned path: /v1/cd/prep-times (lives at the root, not /api)
  getAll: () =>
    api.get<{ data: Record<string, number> }>('/v1/cd/prep-times', {
      baseURL: import.meta.env.VITE_TI_BASE_URL
        ?? import.meta.env.VITE_TI_API_URL?.replace(/\/api\/?$/, '')
        ?? '',
    }),
};

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcementApi = {
  getActive: () =>
    api.get<ApiResponse<TIAnnouncement[]>>('/announcements', { params: { active: true } }),
};

export default api;
