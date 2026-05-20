import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '../admin/pages/Dashboard';
import { dashboardApi } from '../admin/api';

vi.mock('../admin/api', () => ({
  dashboardApi: {
    stats:             vi.fn(),
    recentOrders:      vi.fn(),
    revenue:           vi.fn(),
    menuPerformance:   vi.fn(),
    tableIntelligence: vi.fn(),
    customerBehaviour: vi.fn(),
    alerts:            vi.fn(),
  },
}));

const mockStats = {
  orders_today:    5,
  revenue_today:   120.50,
  tables_occupied: 3,
  pending_orders:  2,
};

const mockOrders = [
  {
    order_id:    1,
    order_total: 45.00,
    status_name: 'Pending',
    created_at:  new Date().toISOString(),
    order_menus: [{ name: 'Jollof Rice', quantity: 1, price: 45 }],
  },
];

const mockRevenue = {
  chart:      [{ date: '2024-01-01', revenue: 100, orders: 2 }],
  totals:     { revenue: 100, orders: 2, avg_order_value: 50 },
  by_type:    [{ type: 'dine-in', revenue: 100, orders: 2 }],
  comparison: { revenue_change_pct: 10, prev_revenue: 90 },
};

const mockAlerts = { alerts: [] };

beforeEach(() => {
  vi.clearAllMocks();
  (dashboardApi.stats as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockStats });
  (dashboardApi.recentOrders as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockOrders });
  (dashboardApi.revenue as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockRevenue });
  (dashboardApi.menuPerformance as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { top: [], bottom: [] } });
  (dashboardApi.tableIntelligence as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: {
      peak_hours:          Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 })),
      peak_days:           [],
      avg_session_minutes: 0,
      total_sessions:      0,
    },
  });
  (dashboardApi.customerBehaviour as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { avg_order_value: 50, total_orders: 2, total_customers: 2, returning_customers: 1, new_customers: 1, return_rate_pct: 50 },
  });
  (dashboardApi.alerts as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockAlerts });
});

describe('Dashboard tab bar', () => {
  it('renders all 7 tabs', () => {
    render(<Dashboard />);
    const expectedTabs = ['Overview', 'Revenue', 'Menu', 'Tables', 'Customers', 'Reports', 'Alerts'];
    expectedTabs.forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    });
  });

  it('shows Overview tab by default', () => {
    render(<Dashboard />);
    const overviewBtn = screen.getByRole('button', { name: 'Overview' });
    expect(overviewBtn.className).toContain('border-[#EC4824]');
  });

  it('switches to Revenue tab on click', async () => {
    render(<Dashboard />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Revenue' }));
    });
    await waitFor(() => {
      expect(dashboardApi.revenue).toHaveBeenCalled();
    });
  });
});

describe('Date preset buttons', () => {
  it('renders all preset buttons', () => {
    render(<Dashboard />);
    ['Today', 'Yesterday', '7 days', '30 days', 'This month'].forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    });
  });

  it('highlights active preset', () => {
    render(<Dashboard />);
    const sevenDay = screen.getByRole('button', { name: '7 days' });
    expect(sevenDay.className).toContain('bg-[#EC4824]');
  });

  it('updates active preset on click', async () => {
    render(<Dashboard />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    });
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    expect(todayBtn.className).toContain('bg-[#EC4824]');
  });
});

describe('OverviewTab', () => {
  it('shows stat cards after stats load', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Orders Today')).toBeTruthy();
      expect(screen.getByText('Revenue Today')).toBeTruthy();
    });
  });
});

describe('AlertsTab', () => {
  it('shows EmptyState when no alerts', async () => {
    render(<Dashboard />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Alerts' }));
    });
    await waitFor(() => {
      expect(screen.getByText(/all clear/i)).toBeTruthy();
    });
  });

  it('shows alert messages when alerts exist', async () => {
    (dashboardApi.alerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        alerts: [{
          type:     'stuck_order',
          severity: 'warning',
          message:  'Order #42 has been in "Pending" for 20 minutes.',
          metadata: { order_id: 42 },
        }],
      },
    });

    render(<Dashboard />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Alerts' }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Order #42/)).toBeTruthy();
    });
  });
});
