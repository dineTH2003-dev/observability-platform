import { loginUser, signupUser } from '../../api/authApi';

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

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await loginUser(credentials);
    return response.data as AuthResponse;
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await signupUser(data);
    return response.data as AuthResponse;
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },

  async resetPassword(_email: string): Promise<void> {
    return Promise.resolve();
  },
};
