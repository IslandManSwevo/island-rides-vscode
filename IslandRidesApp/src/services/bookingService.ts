import { apiService } from './apiService';
import { BookingRequest, BookingResponse } from '../types';

export class BookingService {
  static async createBooking(bookingData: BookingRequest): Promise<BookingResponse> {
    try {
      // No need to pass token - ApiService handles it automatically
      const response = await apiService.post<BookingResponse>('/bookings', bookingData);
      return response;
    } catch (error) {
      throw new Error(`Booking creation failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  static async getBookings(): Promise<BookingResponse[]> {
    try {
      const response = await apiService.get<BookingResponse[]>('/bookings');
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch bookings: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  static async getBookingById(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await apiService.get<BookingResponse>(`/bookings/${bookingId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch booking: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  static async updateBooking(bookingId: string, updateData: Partial<BookingRequest>): Promise<BookingResponse> {
    try {
      const response = await apiService.put<BookingResponse>(`/bookings/${bookingId}`, updateData);
      return response;
    } catch (error) {
      throw new Error(`Failed to update booking: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  static async cancelBooking(bookingId: string): Promise<void> {
    try {
      await apiService.delete(`/bookings/${bookingId}`);
    } catch (error) {
      throw new Error(`Failed to cancel booking: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}