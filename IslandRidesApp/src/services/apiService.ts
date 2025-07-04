import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { BaseService } from './base/BaseService';
import { AuthRoutes } from '../config/apiRoutes';
import { environmentService } from './EnvironmentService';
import { BusinessLogicError } from './errors/BusinessLogicError';
import { storageService } from './storageService';

const TOKEN_KEY = 'user_jwt_token';

interface ApiErrorResponse {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export class ApiService extends BaseService {
  private axiosInstance!: AxiosInstance;
  private axiosInstanceWithoutAuth!: AxiosInstance;

  constructor() {
    super();
  }

  protected async onInit(): Promise<void> {
    await environmentService.waitForInitialization();
    const { baseUrl, timeout } = environmentService.apiConfig;
    if (!baseUrl) {
      throw new Error('API base URL not configured in environment');
    }

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout, // Use timeout from config
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstanceWithoutAuth = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include JWT token in headers
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          // The request was made and the server responded with an error
          const { data, status } = error.response;
          throw new BusinessLogicError(
            data?.message || 'An unexpected error occurred',
            status.toString(),
            data?.details
          );
        } else if (error.request) {
          // The request was made but no response was received
          throw new BusinessLogicError(
            'No response received from server',
            'NETWORK_ERROR'
          );
        } else {
          // Something happened in setting up the request
          throw new BusinessLogicError(
            error.message || 'Failed to make request',
            'REQUEST_SETUP_ERROR'
          );
        }
      }
    );
  }

  // Generic GET request
  async get<T>(endpoint: string, params?: object): Promise<T> {
    const response = await this.axiosInstance.get<T>(endpoint, { params });
    return response.data;
  }

  // Generic POST request
  async post<T>(endpoint:string, data: object): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, data);
    return response.data;
  }
  
  // POST request specifically for routes that do not require authentication
  async postWithoutAuth<T>(endpoint: string, data: object): Promise<T> {
    const response = await this.axiosInstanceWithoutAuth.post<T>(endpoint, data);
    return response.data;
  }

  // Generic PUT request
  async put<T>(endpoint: string, data: object): Promise<T> {
    const response = await this.axiosInstance.put<T>(endpoint, data);
    return response.data;
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.delete<T>(endpoint);
    return response.data;
  }

  // --- Token Management ---

  async storeToken(token: string): Promise<void> {
    try {
      await storageService.set(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing the auth token', error);
      throw new BusinessLogicError(
        'Failed to store authentication token',
        'STORAGE_ERROR'
      );
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await storageService.get(TOKEN_KEY);
    } catch (error) {
      console.error('Error fetching the auth token', error);
      return null;
    }
  }

  async clearToken(): Promise<void> {
    try {
      await storageService.remove(TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing the auth token', error);
      throw new BusinessLogicError(
        'Failed to clear authentication token',
        'STORAGE_ERROR'
      );
    }
  }

  // --- BaseService Implementation ---

}

// Export the singleton instance and the class
export const apiService = ApiService.getInstance();