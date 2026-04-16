import axiosClient from "./axiosClient";

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await axiosClient.post("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};
