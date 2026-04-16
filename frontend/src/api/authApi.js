import axiosClient from "./axiosClient";

export const registerUser = async (payload) => {
  const { data } = await axiosClient.post("/auth/register", payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await axiosClient.post("/auth/login", payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await axiosClient.get("/auth/me");
  return data;
};
