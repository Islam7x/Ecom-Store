import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { productId } from "../lib/format";

const STORAGE_KEY = "luxe-cart";
const CartContext = createContext(null);

const stockLimit = (product) => {
  const stock = Number(product?.stock);
  return Number.isFinite(stock) && stock >= 0 ? stock : Infinity;
};

const readStoredCart = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(readStoredCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const id = productId(product);
    const qty = Math.max(1, Number(quantity) || 1);
    if (!id) return { added: 0, atMax: true };

    let added = 0;
    let atMax = false;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => productId(item) === id);
      const maxStock = stockLimit(product);
      const currentQty = existingItem?.quantity ?? 0;
      const nextQty = Math.min(currentQty + qty, maxStock);
      added = nextQty - currentQty;
      atMax = nextQty >= maxStock;

      if (added <= 0) {
        return prevCart;
      }

      if (existingItem) {
        return prevCart.map((item) =>
          productId(item) === id
            ? { ...item, ...product, quantity: nextQty }
            : item,
        );
      }

      return [...prevCart, { ...product, quantity: nextQty }];
    });

    return { added, atMax };
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          productId(item) === id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const deleteFromCart = useCallback((id) => {
    setCart((prevCart) => prevCart.filter((item) => productId(item) !== id));
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        deleteFromCart,
        cartCount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
