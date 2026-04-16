import axiosClient from "./axiosClient";

export const fetchProducts = async (params = {}) => {
  const { data } = await axiosClient.get("/products", { params });
  return data;
};

export const fetchFeaturedProducts = async () => {
  const { data } = await axiosClient.get("/products/featured");
  return data;
};

export const fetchProductById = async (id) => {
  const { data } = await axiosClient.get(`/products/${id}`);
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await axiosClient.post("/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await axiosClient.put(`/products/${id}`, payload);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await axiosClient.delete(`/products/${id}`);
  return data;
};

export const addReview = async (productId, payload) => {
  const { data } = await axiosClient.post(`/products/${productId}/reviews`, payload);
  return data;
};
