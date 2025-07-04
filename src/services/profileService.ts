import { apiService } from './apiService';
import { ProfileData } from '../types';

export class ProfileService {
  /**
   * Get the current user's profile data including bookings and stats
   */
  static async getProfile(): Promise<ProfileData> {
    try {
      console.log('📱 ProfileService: Fetching user profile...');
      const profileData = await apiService.get<ProfileData>('/users/me/profile');
      console.log('✅ ProfileService: Profile data received:', {
        userId: profileData.user.id,
        bookingsCount: profileData.bookings.length,
        totalSpent: profileData.stats.totalSpent
      });
      return profileData;
    } catch (error) {
      console.error('❌ ProfileService: Failed to fetch profile:', error);
      throw error;
    }
  }
}
