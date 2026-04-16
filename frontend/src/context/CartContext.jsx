import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addToCartApi,
  clearCartApi,
  fetchCart,
  removeCartItemApi,
  updateCartItemApi,
} from "../api/cartApi";
import { getProductImageUrl } from "../utils/image";
import { useAuthContext } from "./AuthContext";

const CartContext = createContext(null);

const LOCAL_CART_KEY = "fashionHubGuestCart";

const readLocalCart = () => {
  const raw = localStorage.getItem(LOCAL_CART_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return [];
  }
};

const saveLocalCart = (items) => {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

const mapBackendCart = (cart) => {
  const items = (cart?.items || []).map((item) => ({
    productId: item.product?._id || item.product,
    name: item.nameSnapshot,
    image: item.imageSnapshot,
    price: item.priceSnapshot,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }));

  return {
    items,
    subtotal: cart?.subtotal || 0,
    itemCount: cart?.itemCount || 0,
  };
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          const response = await fetchCart();
          const mapped = mapBackendCart(response.data);
          setItems(mapped.items);
        } else {
          setItems(readLocalCart());
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      saveLocalCart(items);
    }
  }, [items, isAuthenticated]);

  const addItem = async ({ product, quantity = 1, size, color }) => {
    if (isAuthenticated) {
      const response = await addToCartApi({ productId: product._id, quantity, size, color });
      const mapped = mapBackendCart(response.data);
      setItems(mapped.items);
      return;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product._id && item.size === size && item.color === color
      );

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: Math.min(copy[existingIndex].quantity + quantity, 99),
        };
        return copy;
      }

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          image: getProductImageUrl(product, product?.name),
          price: product.price,
          quantity,
          size,
          color,
        },
      ];
    });
  };

  const updateItem = async ({ productId, quantity, size, color }) => {
    if (isAuthenticated) {
      const response = await updateCartItemApi(productId, { quantity, size, color });
      const mapped = mapBackendCart(response.data);
      setItems(mapped.items);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeItem = async ({ productId, size, color }) => {
    if (isAuthenticated) {
      const response = await removeCartItemApi(productId, { size, color });
      const mapped = mapBackendCart(response.data);
      setItems(mapped.items);
      return;
    }

    setItems((prev) =>
      prev.filter(
        (item) =>
          !(item.productId === productId && item.size === size && item.color === color)
      )
    );
  };

  const clearItems = async () => {
    if (isAuthenticated) {
      await clearCartApi();
    }

    setItems([]);
  };

  const { itemCount, subtotal } = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
    return { itemCount: count, subtotal: total };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      loading,
      addItem,
      updateItem,
      removeItem,
      clearItems,
    }),
    [items, itemCount, subtotal, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCartContext must be used inside CartProvider");
  return context;
};
