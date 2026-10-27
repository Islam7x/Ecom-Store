import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { productId } from "../lib/format";

const STORAGE_KEY = "luxe-wishlist";
const WishlistContext = createContext(null);

const readStoredWishlist = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(readStoredWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isInWishlist = useCallback(
    (product) => items.some((item) => productId(item) === productId(product)),
    [items],
  );

  const toggleWishlist = useCallback((product) => {
    const id = productId(product);
    if (!id) return false;

    let added = false;
    setItems((current) => {
      if (current.some((item) => productId(item) === id)) {
        return current.filter((item) => productId(item) !== id);
      }
      added = true;
      return [
        ...current,
        {
          _id: id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          stock: product.stock,
        },
      ];
    });
    return added;
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setItems((current) => current.filter((item) => productId(item) !== id));
  }, []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
    }),
    [items, isInWishlist, toggleWishlist, removeFromWishlist],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
