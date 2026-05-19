/**
 * Fuzz Tests — send unexpected, boundary, and malformed inputs to the API
 * client to uncover hidden bugs and ensure the client degrades gracefully.
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { menuApi, locationApi, reservationApi, prepTimeApi } from '../../src/lib/api';
import type { ReservationInput } from '../../src/types';

const BASE      = 'http://localhost:8000/api';
const BASE_ROOT = 'http://localhost:8000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const randomString = (len: number) =>
  Array.from({ length: len }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

const randomInt = (max: number) => Math.floor(Math.random() * max);

// ─── menuApi Fuzz ─────────────────────────────────────────────────────────────

describe('Fuzz Tests — menuApi.getItems locationId parameter', () => {
  const oddLocationIds = [0, -1, 999999999, 1.5, NaN, Infinity, -Infinity];

  oddLocationIds.forEach((id) => {
    it(`getItems(${id}) does not throw — resolves or rejects gracefully`, async () => {
      server.use(
        http.get(`${BASE}/menus`, () => HttpResponse.json({ data: [] }))
      );
      try {
        const res = await menuApi.getItems(id as any);
        expect([200, 400, 404, 422]).toContain(res.status);
      } catch (err: any) {
        // Axios rejects on 4xx/5xx — that's acceptable, not a crash
        expect(err).toHaveProperty('message');
      }
    });
  });

  it('getItems with undefined locationId still completes (no crash)', async () => {
    const res = await menuApi.getItems(undefined);
    expect(res.status).toBe(200);
  });
});

// ─── locationApi Fuzz ─────────────────────────────────────────────────────────

describe('Fuzz Tests — locationApi.get id parameter', () => {
  it('get(0) is handled — resolves or rejects without throwing', async () => {
    server.use(
      http.get(`${BASE}/locations/0`, () =>
        HttpResponse.json({ message: 'Not Found' }, { status: 404 })
      )
    );
    await expect(locationApi.get(0)).rejects.toMatchObject({ response: { status: 404 } });
  });

  it('get with very large integer completes without crash', async () => {
    server.use(
      http.get(`${BASE}/locations/:id`, () =>
        HttpResponse.json({ message: 'Not Found' }, { status: 404 })
      )
    );
    await expect(locationApi.get(Number.MAX_SAFE_INTEGER)).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});

// ─── reservationApi Fuzz ──────────────────────────────────────────────────────

describe('Fuzz Tests — reservationApi.create with unexpected payloads', () => {
  const serverAlwaysRejects = () => {
    server.use(
      http.post(`${BASE}/reservations`, () =>
        HttpResponse.json({ message: 'Validation Error', errors: {} }, { status: 422 })
      )
    );
  };

  it('empty strings for all fields returns 422', async () => {
    serverAlwaysRejects();
    const emptyInput: ReservationInput = {
      first_name: '',
      last_name: '',
      email: '',
      telephone: '',
      guest_num: 0,
      reserve_date: '',
      reserve_time: '',
      location_id: 0,
    };
    await expect(reservationApi.create(emptyInput)).rejects.toMatchObject({
      response: { status: 422 },
    });
  });

  it('very long strings in name fields do not crash the client', async () => {
    serverAlwaysRejects();
    const longInput: ReservationInput = {
      first_name: randomString(10000),
      last_name: randomString(10000),
      email: randomString(5000) + '@x.com',
      telephone: randomString(100),
      guest_num: -1,
      reserve_date: randomString(50),
      reserve_time: randomString(50),
      location_id: -999,
    };
    try {
      await reservationApi.create(longInput);
    } catch (err: any) {
      expect(err).toHaveProperty('message');
    }
  });

  it('unicode and emoji in name fields do not crash the client', async () => {
    server.use(
      http.post(`${BASE}/reservations`, async () =>
        HttpResponse.json({ data: { reservation_id: 1 } }, { status: 201 })
      )
    );
    const unicodeInput: ReservationInput = {
      first_name: '测试名字 🍽️',
      last_name: 'Ñoño & Co.',
      email: 'user@example.com',
      telephone: '+000000000',
      guest_num: 2,
      reserve_date: '2026-07-01',
      reserve_time: '12:00',
      location_id: 1,
    };
    const res = await reservationApi.create(unicodeInput);
    expect(res.status).toBe(201);
  });

  it('SQL injection string in name fields is sent as-is (server handles sanitisation)', async () => {
    server.use(
      http.post(`${BASE}/reservations`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { reservation_id: 1, first_name: body.first_name } }, { status: 201 });
      })
    );
    const sqlInput: ReservationInput = {
      first_name: "'; DROP TABLE reservations; --",
      last_name: '1 OR 1=1',
      email: 'attacker@example.com',
      telephone: '+000',
      guest_num: 1,
      reserve_date: '2026-06-01',
      reserve_time: '12:00',
      location_id: 1,
    };
    const res = await reservationApi.create(sqlInput);
    // Client sends it; server is responsible for parameterised queries
    expect(res.status).toBe(201);
  });
});

// ─── reservationApi.getSlots Fuzz ─────────────────────────────────────────────

describe('Fuzz Tests — reservationApi.getSlots with unusual params', () => {
  it('negative guests count is forwarded to server without client crash', async () => {
    server.use(
      http.get(`${BASE}/reservations/timeslots`, () =>
        HttpResponse.json({ message: 'Validation Error' }, { status: 422 })
      )
    );
    await expect(
      reservationApi.getSlots({ date: '2026-06-01', guests: -5, location_id: 1 })
    ).rejects.toMatchObject({ response: { status: 422 } });
  });

  it('malformed date string is forwarded to server without client crash', async () => {
    server.use(
      http.get(`${BASE}/reservations/timeslots`, () =>
        HttpResponse.json({ message: 'Validation Error' }, { status: 422 })
      )
    );
    await expect(
      reservationApi.getSlots({ date: 'not-a-date', guests: 2, location_id: 1 })
    ).rejects.toMatchObject({ response: { status: 422 } });
  });
});

// ─── prepTimeApi Fuzz ─────────────────────────────────────────────────────────

describe('Fuzz Tests — prepTimeApi.getAll unexpected server responses', () => {
  it('empty data object does not crash consumer iteration', async () => {
    server.use(
      http.get(`${BASE_ROOT}/v1/cd/prep-times`, () => HttpResponse.json({ data: {} }))
    );
    const res = await prepTimeApi.getAll();
    expect(Object.keys(res.data.data)).toHaveLength(0);
  });

  it('null values for prep times are returned as-is for consumer to handle', async () => {
    server.use(
      http.get(`${BASE_ROOT}/v1/cd/prep-times`, () =>
        HttpResponse.json({ data: { '1': null, '2': 15, '3': null } })
      )
    );
    const res = await prepTimeApi.getAll();
    expect(res.data.data['1']).toBeNull();
    expect(res.data.data['2']).toBe(15);
  });
});
