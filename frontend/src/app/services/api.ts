const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
  responseType?: "json" | "blob";
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      ...(options.responseType !== "blob" && {
        "Content-Type": "application/json",
      }),
      ...options.headers,
    };

    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        sessionStorage.removeItem("accessToken");

        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }

      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        // Ignore if body is not JSON
      }

      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        `HTTP error! status: ${response.status}`;

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    // 🔥 IMPORTANT PART
    if (options.responseType === "blob") {
      return (await response.blob()) as T;
    }

    return (await response.json()) as T;
  }

  async get<T>(
    endpoint: string,
    options?: { responseType?: "json" | "blob" }
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      ...options,
    });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiService(API_BASE_URL);
