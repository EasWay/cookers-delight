import { Link, useLocation } from 'react-router-dom';
import { HiHome, HiChevronRight } from 'react-icons/hi2';
import { findNavItem, findNavSection } from '../adminNav';

/**
 * Top-of-page trail: Admin › Section › Page.
 *
 * Renders nothing on /admin/login (no breadcrumb makes sense pre-auth)
 * and on /admin/dashboard (Home is already the dashboard — no extra crumb
 * needed). Otherwise renders a compact, accessible nav.
 */
export default function Breadcrumbs() {
  const { pathname } = useLocation();

  // Hide on the dashboard (it IS home) and on login.
  if (pathname === '/admin/dashboard' || pathname === '/admin/login') return null;

  const item    = findNavItem(pathname);
  const section = findNavSection(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-[11px] font-medium min-w-0">
      <Link
        to="/admin/dashboard"
        className="flex items-center gap-1 text-[#A8A29E] hover:text-[#1C1917] transition-colors flex-shrink-0"
      >
        <HiHome size={11} />
        <span className="hidden sm:inline">Admin</span>
      </Link>

      {section && (
        <>
          <Chev />
          <span className="text-[#A8A29E] truncate">{section.label}</span>
        </>
      )}

      {item && (
        <>
          <Chev />
          <span className="text-[#1C1917] font-semibold truncate">{item.short ?? item.label}</span>
        </>
      )}
    </nav>
  );
}

function Chev() {
  return <HiChevronRight size={11} className="mx-1.5 text-[#EDE8E3] flex-shrink-0" />;
}
