import AsyncStorage from '@react-native-async-storage/async-storage';

// You can move this to a config file later
const API_BASE_URL = 'http://localhost:3003/api';

export class ApiService {
  private static readonly TOKEN_KEY = 'auth_token';
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Token management methods
  static async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store auth token:', error);
      throw new Error('Could not store authentication token');
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }

  static async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear auth token:', error);
      throw new Error('Could not clear authentication token');
    }
  }

  // HTTP request methods
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const token = await ApiService.getToken();
    return this.request<T>(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const token = await ApiService.getToken();
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data),
    });
  }

  async postWithoutAuth<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const token = await ApiService.getToken();
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const token = await ApiService.getToken();
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }

  async refreshToken(): Promise<void> {
    try {
      const response = await this.post<{ token: string }>('/auth/refresh', {});
      if (response.token) {
        await ApiService.storeToken(response.token);
      } else {
        throw new Error('No token received during refresh');
      }
    } catch (error) {
      await ApiService.clearToken();
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiServiceInstance = new ApiService();
export default apiServiceInstance;
