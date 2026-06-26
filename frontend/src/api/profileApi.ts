import api from "./api";
import type {
  PasswordChangePayload,
  ProfileFormValues,
  UserProfile,
} from "../app/types/user";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface MessageEnvelope {
  success: boolean;
  message: string;
}

export async function getProfile() {
  const response = await api.get<ApiEnvelope<UserProfile>>("/profile");
  return response.data.data;
}

export async function updateProfile(payload: ProfileFormValues) {
  const response = await api.put<ApiEnvelope<UserProfile>>("/profile", payload);
  return response.data.data;
}

export async function changePassword(payload: PasswordChangePayload) {
  const response = await api.post<MessageEnvelope>("/profile/change-password", payload);
  return response.data.message;
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.post<ApiEnvelope<UserProfile>>(
    "/profile/upload-avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data;
}

export async function deleteAvatar() {
  const response = await api.delete<ApiEnvelope<UserProfile>>("/profile/avatar");
  return response.data.data;
}

export async function deleteProfile() {
  const response = await api.delete<MessageEnvelope>("/profile");
  return response.data.message;
}
