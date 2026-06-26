export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export interface UserProfile extends User {
  phone?: string;
  department?: string;
  location?: string;
  bio?: string;
}

export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  bio: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
