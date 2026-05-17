import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiArrowRightOnRectangle,
  HiUser,
} from 'react-icons/hi2';
import { useAdminAuth } from './AdminAuthContext';
import { navSections } from './adminNav';
import Breadcrumbs from './components/Breadcrumbs';

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Compact, tightly-spaced nav row — small icon, small text, generous
  // hit-target via vertical padding only. Active state uses the brand
  // accent with a subtle pill so the eye lands on it without shouting.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
      isActive
        ? 'bg-[#EC4824]/12 text-[#EC4824]'
        : 'text-white/45 hover:text-white hover:bg-white/[0.04]'
    }`;

  const Sidebar = () => (
    <aside className="w-56 flex-shrink-0 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <span className="text-base font-black tracking-tight leading-none block">
          Cookers<span className="text-[#EC4824]">Delight</span>
        </span>
        <p className="text-[9px] text-white/25 uppercase tracking-[0.18em] font-bold mt-1">
          Admin Console
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] px-2.5 mb-1">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-2.5 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 mb-0.5">
          <div className="w-7 h-7 rounded-full bg-[#EC4824]/15 flex items-center justify-center text-[#EC4824] flex-shrink-0">
            <HiUser size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate leading-tight">
              {user?.name ?? 'Admin'}
            </p>
            <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-1.5 w-full rounded-lg text-[12px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <HiArrowRightOnRectangle size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-panel min-h-screen bg-[#0d0d0d] text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-56">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar — breadcrumb trail on the left, live indicator on the right */}
        <header className="h-11 border-b border-white/[0.06] flex items-center px-5 gap-3 flex-shrink-0 bg-[#0a0a0a]">
          <button
            className="lg:hidden text-white/50 hover:text-white -ml-1 p-1"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <HiBars3 size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <Breadcrumbs />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-white/35 font-bold uppercase tracking-[0.15em] flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </header>

        {/* Page content — aggressive mobile padding, breathes on desktop. */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3.5 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
