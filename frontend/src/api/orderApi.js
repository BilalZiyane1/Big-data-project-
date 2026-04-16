import axiosClient from "./axiosClient";

export const createOrder = async (payload) => {
  const { data } = await axiosClient.post("/orders", payload);
  return data;
};

export const createPaymentIntent = async (payload) => {
  const { data } = await axiosClient.post("/orders/payment-intent", payload);
  return data;
};

export const fetchMyOrders = async (params = {}) => {
  const { data } = await axiosClient.get("/orders/my", { params });
  return data;
};

export const fetchAllOrders = async (params = {}) => {
  const { data } = await axiosClient.get("/orders/admin/all", { params });
  return data;
};

export const updateOrderStatus = async (id, status) => {
  const { data } = await axiosClient.put(`/orders/admin/${id}/status`, { status });
  return data;
};
