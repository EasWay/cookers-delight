import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CartProvider }    from './contexts/CartContext';
import { SessionProvider } from './contexts/SessionContext';
import ScanPage            from './pages/ScanPage';
import MenuPage            from './pages/MenuPage';
import CheckoutPage        from './pages/CheckoutPage';
import OrderTrackingPage   from './pages/OrderTrackingPage';

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <SessionProvider>
          <Routes>
            {/* Entry point — QR code scanned */}
            <Route path="/table/:stableToken"           element={<ScanPage />} />

            {/* Dine-in ordering flow */}
            <Route path="/table/:stableToken/menu"      element={<MenuPage />} />
            <Route path="/table/:stableToken/checkout"  element={<CheckoutPage />} />
            <Route path="/table/:stableToken/track"     element={<OrderTrackingPage />} />

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
        </SessionProvider>
      </CartProvider>
    </BrowserRouter>
  );
}
