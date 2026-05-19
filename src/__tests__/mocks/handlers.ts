import { http, HttpResponse } from 'msw';

const BASE      = 'http://localhost:8000/api';
const BASE_ROOT = 'http://localhost:8000'; // prepTimeApi strips /api from baseURL

// ─── Fixture data ────────────────────────────────────────────────────────────

export const fixtureCategory = {
  category_id: 1,
  name: 'Starters',
  description: 'Appetisers and light bites',
  priority: 1,
  status: true,
};

export const fixtureMenuItem = {
  menu_id: 10,
  menu_name: 'Jollof Rice',
  menu_description: 'West African classic',
  menu_price: 45.0,
  menu_status: true,
  prep_time_minutes: 20,
  categories: [fixtureCategory],
};

export const fixtureLocation = {
  location_id: 1,
  location_name: 'Osu Branch',
  location_email: 'osu@cookersdelight.com',
  location_telephone: '+233200000001',
  location_address_1: '12 Oxford Street',
  location_address_2: '',
  location_city: 'Accra',
  location_status: true,
  permalink_slug: 'osu',
};

export const fixtureReservation = {
  reservation_id: 99,
  first_name: 'Ama',
  last_name: 'Owusu',
  email: 'ama@example.com',
  telephone: '+233200000000',
  guest_num: 2,
  reserve_date: '2026-06-01',
  reserve_time: '13:00',
  location_id: 1,
  status_id: 1,
};

export const fixtureAnnouncement = {
  id: 1,
  message: 'Happy Hour 5–7 pm every Friday!',
  link: null,
  background_color: '#c0392b',
  text_color: '#ffffff',
  is_active: true,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // Menu items
  http.get(`${BASE}/menus`, () =>
    HttpResponse.json({ data: [fixtureMenuItem], meta: { pagination: { total: 1, count: 1, per_page: 100, current_page: 1, total_pages: 1 } } })
  ),

  // Categories
  http.get(`${BASE}/categories`, () =>
    HttpResponse.json({ data: [fixtureCategory] })
  ),

  // Locations list
  http.get(`${BASE}/locations`, () =>
    HttpResponse.json({ data: [fixtureLocation] })
  ),

  // Single location
  http.get(`${BASE}/locations/:id`, ({ params }) => {
    if (String(params.id) === '1') {
      return HttpResponse.json({ data: fixtureLocation });
    }
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),

  // Reservation timeslots
  http.get(`${BASE}/reservations/timeslots`, () =>
    HttpResponse.json({ data: ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'] })
  ),

  // Create reservation
  http.post(`${BASE}/reservations`, () =>
    HttpResponse.json({ data: fixtureReservation }, { status: 201 })
  ),

  // Prep times (uses root base URL, not /api)
  http.get(`${BASE_ROOT}/v1/cd/prep-times`, () =>
    HttpResponse.json({ data: { '10': 20, '11': 15, '12': 30 } })
  ),

  // Announcements
  http.get(`${BASE}/announcements`, () =>
    HttpResponse.json({ data: [fixtureAnnouncement] })
  ),
];
