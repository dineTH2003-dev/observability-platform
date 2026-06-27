import api from "./api";

export const signupUser = (data: unknown) => api.post("/auth/signup", data);
export const loginUser = (data: unknown) => api.post("/auth/login", data);
