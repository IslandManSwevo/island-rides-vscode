import { ApiErrorCode, ErrorMeta } from '../types';
import { notificationService } from './notificationService';

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
}

class NetworkService {
  private static defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2
  };

  static async retryRequest<T>(
    requestFn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: any;
    let attempt = 1;
    let delay = retryConfig.delayMs;

    while (attempt <= retryConfig.maxAttempts) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error.response?.status === 401 || // Unauthorized
            error.response?.status === 403 || // Forbidden
            error.response?.status === 422) { // Validation error
          throw error;
        }

        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Show retry notification
        notificationService.warning(`Retrying request (${attempt}/${retryConfig.maxAttempts})...`, {
          duration: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= retryConfig.backoffFactor;
        attempt++;
      }
    }

    throw lastError;
  }

  static isNetworkError(error: any): boolean {
    return !error.response && error.request;
  }

  static isServerError(error: any): boolean {
    return error.response?.status >= 500;
  }

  static isClientError(error: any): boolean {
    return error.response?.status >= 400 && error.response?.status < 500;
  }

  static getErrorCode(error: any): ApiErrorCode {
    if (this.isNetworkError(error)) {
      return 'NETWORK_ERROR';
    }
    if (this.isServerError(error)) {
      return 'SERVER_ERROR';
    }
    return error.response?.data?.code || 'UNKNOWN_ERROR';
  }
}

export default NetworkService;
