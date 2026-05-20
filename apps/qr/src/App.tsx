import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CartProvider }    from './contexts/CartContext';
import { SessionProvider } from './contexts/SessionContext';
import ScanPage            from './pages/ScanPage';
import MenuPage            from './pages/MenuPage';
import CheckoutPage        from './pages/CheckoutPage';
import OrderTrackingPage   from './pages/OrderTrackingPage';
import KitchenLoginPage    from './pages/KitchenLoginPage';
import KitchenPage         from './pages/KitchenPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kitchen display — no cart/session context needed */}
        <Route path="/kitchen"         element={<KitchenLoginPage />} />
        <Route path="/kitchen/display" element={<KitchenPage />} />

        {/* Dine-in ordering flow */}
        <Route path="/table/*" element={
          <CartProvider>
            <SessionProvider>
              <Routes>
                <Route path=":stableToken"          element={<ScanPage />} />
                <Route path=":stableToken/menu"     element={<MenuPage />} />
                <Route path=":stableToken/checkout" element={<CheckoutPage />} />
                <Route path=":stableToken/track"    element={<OrderTrackingPage />} />
              </Routes>
            </SessionProvider>
          </CartProvider>
        } />

        {/* Fallback */}
        <Route path="*" element={
          <div
            className="min-h-screen flex items-center justify-center text-center px-6"
            style={{ backgroundColor: 'var(--cd-bg)', color: 'var(--cd-muted)' }}
          >
            <div>
              <p className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Cookers Delight
              </p>
              <p className="text-sm">Please scan the QR code on your table.</p>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
