import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { TIMenuItem } from '../types';

export interface CartItem {
  menu_id: number;
  menu_name: string;
  menu_price: number;
  prep_time_minutes: number;
  thumb?: string;
  quantity: number;
}

interface CartContextValue {
  cart: CartItem[];
  totalQty: number;
  total: number;
  estimatedWait: number;
  addToCart: (item: TIMenuItem, qty?: number) => void;
  updateQty: (id: number, delta: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  hasItem: (id: number) => CartItem | undefined;
}

const STORAGE_KEY = 'cd_qr_cart_v1';

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* quota errors are non-fatal */
    }
  }, [cart]);

  const addToCart = useCallback((item: TIMenuItem, qty: number = 1) => {
    const prepTime = item.prep_time_minutes ?? 15;
    setCart(prev => {
      const existing = prev.find(i => i.menu_id === item.menu_id);
      if (existing) {
        return prev.map(i =>
          i.menu_id === item.menu_id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [
        ...prev,
        {
          menu_id: item.menu_id,
          menu_name: item.menu_name,
          menu_price: Number(item.menu_price),
          prep_time_minutes: prepTime,
          thumb: item.thumb,
          quantity: qty,
        },
      ];
    });
  }, []);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart(prev =>
      prev.map(i => (i.menu_id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart(prev => prev.filter(i => i.menu_id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<CartContextValue>(() => {
    const totalQty = cart.reduce((acc, i) => acc + i.quantity, 0);
    const total = cart.reduce((acc, i) => acc + i.menu_price * i.quantity, 0);
    const estimatedWait =
      cart.length > 0 ? Math.max(...cart.map(i => i.prep_time_minutes)) + 5 : 0;
    return {
      cart,
      totalQty,
      total,
      estimatedWait,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      hasItem: (id: number) => cart.find(i => i.menu_id === id),
    };
  }, [cart, addToCart, updateQty, removeFromCart, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
