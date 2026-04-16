import axiosClient from "./axiosClient";

export const fetchCart = async () => {
  const { data } = await axiosClient.get("/cart");
  return data;
};

export const addToCartApi = async (payload) => {
  const { data } = await axiosClient.post("/cart/items", payload);
  return data;
};

export const updateCartItemApi = async (productId, payload) => {
  const { data } = await axiosClient.put(`/cart/items/${productId}`, payload);
  return data;
};

export const removeCartItemApi = async (productId, params = {}) => {
  const { data } = await axiosClient.delete(`/cart/items/${productId}`, { params });
  return data;
};

export const clearCartApi = async () => {
  const { data } = await axiosClient.delete("/cart");
  return data;
};
