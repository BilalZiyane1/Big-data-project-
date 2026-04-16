import axiosClient from "./axiosClient";

export const fetchProfile = async () => {
  const { data } = await axiosClient.get("/users/me");
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await axiosClient.put("/users/me", payload);
  return data;
};

export const fetchWishlist = async () => {
  const { data } = await axiosClient.get("/users/wishlist");
  return data;
};

export const addToWishlist = async (productId) => {
  const { data } = await axiosClient.post(`/users/wishlist/${productId}`);
  return data;
};

export const removeFromWishlist = async (productId) => {
  const { data } = await axiosClient.delete(`/users/wishlist/${productId}`);
  return data;
};
