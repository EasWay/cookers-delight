import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public site
import PublicLayout  from './pages/PublicLayout';
import HomePage      from './pages/HomePage';
import MenuPage      from './pages/MenuPage';
import GalleryPage   from './pages/GalleryPage';
import BranchesPage  from './pages/BranchesPage';
import ReviewsPage   from './pages/ReviewsPage';
import BookingsPage  from './pages/BookingsPage';
import ContactPage   from './pages/ContactPage';
import MenuItemDetailPage from './pages/MenuItemDetailPage';
import BranchDetailPage   from './pages/BranchDetailPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import FeedbackPage   from './pages/FeedbackPage';

// Admin
import { AdminAuthProvider, useAdminAuth } from './admin/AdminAuthContext';
import AdminLayout      from './admin/AdminLayout';
import AdminLogin       from './admin/AdminLogin';
import Dashboard        from './admin/pages/Dashboard';
import Orders           from './admin/pages/Orders';
import Menu             from './admin/pages/Menu';
import Categories       from './admin/pages/Categories';
import Tables           from './admin/pages/Tables';
import Locations        from './admin/pages/Locations';
import Announcements    from './admin/pages/Announcements';
import Settings         from './admin/pages/Settings';

function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAdminAuth();
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* ── Public site ── */}
          <Route path="/" element={<PublicLayout />}>
            <Route index                       element={<HomePage />} />
            <Route path="menu"                 element={<MenuPage />} />
            <Route path="menu/:menuId"         element={<MenuItemDetailPage />} />
            <Route path="gallery"              element={<GalleryPage />} />
            <Route path="branches"             element={<BranchesPage />} />
            <Route path="branches/:slug"       element={<BranchDetailPage />} />
            <Route path="reviews"              element={<ReviewsPage />} />
            <Route path="bookings"             element={<BookingsPage />} />
            <Route path="bookings/confirmation" element={<BookingConfirmationPage />} />
            <Route path="contact"              element={<ContactPage />} />
            <Route path="feedback"             element={<FeedbackPage />} />
          </Route>

          {/* ── Admin panel ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdminAuth>
                <AdminLayout />
              </RequireAdminAuth>
            }
          >
            <Route index                  element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard"       element={<Dashboard />} />
            <Route path="orders"          element={<Orders />} />
            <Route path="menu"            element={<Menu />} />
            <Route path="categories"      element={<Categories />} />
            <Route path="tables"          element={<Tables />} />
            <Route path="locations"       element={<Locations />} />
            <Route path="announcements"   element={<Announcements />} />
            <Route path="settings"        element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
}
