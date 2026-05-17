import type { ReactNode } from 'react';
import {
  HiChartBarSquare,
  HiClipboardDocumentList,
  HiQrCode,
  HiMapPin,
  HiCog6Tooth,
  HiMegaphone,
  HiSquares2X2,
  HiTag,
} from 'react-icons/hi2';

/**
 * Single source of truth for the admin sidebar nav.
 * Imported by both AdminLayout (renders the sidebar) and Breadcrumbs
 * (uses the matching item's label for the current route).
 */

export interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
  /** Short label rendered in breadcrumbs / collapsed states. Falls back to label. */
  short?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const ICON_SIZE = 15; // compact, matches the WeCare-style spec.

export const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: <HiChartBarSquare size={ICON_SIZE} />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/orders', icon: <HiClipboardDocumentList size={ICON_SIZE} />, label: 'Orders' },
      { to: '/admin/tables', icon: <HiQrCode size={ICON_SIZE} />, label: 'Tables & QR', short: 'Tables' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/menu', icon: <HiSquares2X2 size={ICON_SIZE} />, label: 'Menu Items', short: 'Menu' },
      { to: '/admin/categories', icon: <HiTag size={ICON_SIZE} />, label: 'Categories' },
    ],
  },
  {
    label: 'Customer',
    items: [
      { to: '/admin/announcements', icon: <HiMegaphone size={ICON_SIZE} />, label: 'Announcements' },
      { to: '/admin/locations', icon: <HiMapPin size={ICON_SIZE} />, label: 'Locations' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: <HiCog6Tooth size={ICON_SIZE} />, label: 'Settings' },
    ],
  },
];

const flatItems: NavItem[] = navSections.flatMap((s) => s.items);

/** Find the nav item that matches `pathname` exactly, or its closest prefix. */
export function findNavItem(pathname: string): NavItem | undefined {
  // Exact match first.
  const exact = flatItems.find((i) => i.to === pathname);
  if (exact) return exact;
  // Prefix fallback (e.g. /admin/menu/123/edit → "Menu Items").
  return flatItems
    .filter((i) => pathname.startsWith(i.to + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

/** Find the section the matching nav item belongs to (for two-level breadcrumbs). */
export function findNavSection(pathname: string): NavSection | undefined {
  const item = findNavItem(pathname);
  if (!item) return undefined;
  return navSections.find((s) => s.items.includes(item));
}
