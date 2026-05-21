import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiArrowRightOnRectangle,
  HiBell,
  HiXMark,
} from 'react-icons/hi2';
import { useAdminAuth } from './AdminAuthContext';
import { navSections } from './adminNav';
import Breadcrumbs from './components/Breadcrumbs';

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CD';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-[#EC4824] text-white shadow-sm'
        : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFE8]'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <span className="text-lg font-black tracking-tight leading-none">
          Cookers<span className="text-[#EC4824]">Delight</span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#78716C] hover:bg-[#F5EFE8] transition-colors"
        >
          <HiXMark size={18} />
        </button>
      </div>
      <div className="h-px bg-[#EDE8E3] mx-4" />

      {/* Profile section */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #EC4824, #d4401f)' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1C1917] truncate leading-tight">
            {user?.name ?? 'Admin'}
          </p>
          <p className="text-[11px] text-[#A8A29E] truncate">Administrator</p>
        </div>
      </div>
      <div className="h-px bg-[#EDE8E3] mx-4 mb-2" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.18em] px-3 mb-1.5">
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
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-[#EDE8E3]">
        <button
          onClick={() => { logout(); navigate('/admin/login'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-[#EC4824] hover:bg-[#FFF1EE] transition-colors"
        >
          <HiArrowRightOnRectangle size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: '#FFFBF7', fontFamily: 'Syne, system-ui, sans-serif' }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[240px] flex-shrink-0 bg-white"
        style={{ borderRight: '1px solid #EDE8E3' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-[240px] flex-shrink-0 bg-white flex flex-col h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex-shrink-0 bg-white px-4 sm:px-6 py-3.5 flex items-center gap-4"
          style={{ borderBottom: '1px solid #EDE8E3' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#78716C] hover:bg-[#F5EFE8] transition-colors"
          >
            <HiBars3 size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[#78716C] hover:bg-[#F5EFE8] transition-colors">
              <HiBell size={18} />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #EC4824, #d4401f)' }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
