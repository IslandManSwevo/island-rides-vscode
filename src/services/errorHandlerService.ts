import { ApiErrorCode, ErrorCategory, ErrorMeta } from '../types';
import { notificationService } from './notificationService';

class ErrorHandlerService {
  handleApiError(error: any, category: ErrorCategory = ErrorCategory.TECHNICAL) {
    let code: ApiErrorCode = 'SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (error.response) {
      code = error.response.data?.code || 'SERVER_ERROR';
      message = error.response.data?.message || 'Server error';

      switch (code) {
        case 'TOKEN_EXPIRED':
          notificationService.error('Your session has expired. Please log in again.', {
            title: 'Session Expired',
            duration: 5000
          });
          // Redirect to login
          break;

        case 'UNAUTHORIZED':
          notificationService.error('Please log in to continue.', {
            title: 'Authentication Required',
            duration: 4000
          });
          break;

        case 'VALIDATION_ERROR':
          notificationService.warning(message, {
            title: 'Validation Error',
            duration: 5000
          });
          break;

        case 'RATE_LIMITED':
          notificationService.warning('Too many attempts. Please try again later.', {
            title: 'Rate Limited',
            duration: 6000
          });
          break;

        case 'MAINTENANCE_MODE':
          notificationService.info('System is under maintenance. Please try again later.', {
            title: 'Maintenance',
            duration: 0,
            closable: false
          });
          break;

        default:
          notificationService.error(message, {
            title: 'Error',
            duration: 5000
          });
      }
    }

    return {
      code,
      message,
      category,
      timestamp: new Date().toISOString()
    } as ErrorMeta;
  }
}

export const errorHandlerService = new ErrorHandlerService();
