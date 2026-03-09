import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api",
});

export const signupUser = (data: any) => API.post("/auth/signup", data);
export const loginUser = (data: any) => API.post("/auth/login", data);
