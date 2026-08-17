import {
  loginUser,
  resendVerificationEmail,
  signupUser,
  verifyEmailToken,
} from '../../api/authApi';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'engineer';
  };
}

export interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'engineer';
    email_verified?: boolean;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await loginUser(credentials);
    return response.data as AuthResponse;
  },

  async signup(data: SignupData): Promise<SignupResponse> {
    const response = await signupUser(data);
    return response.data as SignupResponse;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await verifyEmailToken(token);
    return response.data as { message: string };
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await resendVerificationEmail({ email });
    return response.data as { message: string };
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },

  async resetPassword(_email: string): Promise<void> {
    return Promise.resolve();
  },
};
