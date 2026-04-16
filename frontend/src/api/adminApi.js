import axiosClient from "./axiosClient";

export const fetchDashboardStats = async () => {
  const { data } = await axiosClient.get("/admin/stats");
  return data;
};

export const fetchAdminUsers = async (params = {}) => {
  const { data } = await axiosClient.get("/admin/users", { params });
  return data;
};

export const updateAdminUserRole = async (id, role) => {
  const { data } = await axiosClient.put(`/admin/users/${id}/role`, { role });
  return data;
};
