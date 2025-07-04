import { apiService } from './apiService';
import { VehicleRecommendation, Island } from '../types';
import { BusinessLogicError } from './errors/BusinessLogicError';

// Interface for vehicle recommendations response
interface VehicleRecommendationsResponse {
  recommendations: VehicleRecommendation[];
}

class VehicleService {
  private static instance: VehicleService;

  private constructor() {}

  static getInstance(): VehicleService {
    if (!VehicleService.instance) {
      VehicleService.instance = new VehicleService();
    }
    return VehicleService.instance;
  }
  // Add this debug method
  async debugGetVehiclesByIsland(island: Island): Promise<VehicleRecommendation[]> {
    try {
      console.log('🏝️ Fetching vehicles for island:', island);
      
      // Check if token exists before making request
      const token = await apiService.getToken();
      console.log('🔑 Token exists for vehicle request:', !!token);
      
      const data = await apiService.get<VehicleRecommendationsResponse>(`/recommendations/${island}`);
      console.log('✅ Vehicle data received:', data);
      return data.recommendations;
    } catch (error) {
      console.error('❌ Vehicle fetch error:', error);
      throw new Error(`Failed to fetch vehicles: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  // Keep your existing method too
  async getVehiclesByIsland(island: Island): Promise<VehicleRecommendation[]> {
    try {
      const data = await apiService.get<VehicleRecommendationsResponse>(`/recommendations/${island}`);
      return data.recommendations;
    } catch (error) {
      throw new Error(`Failed to fetch vehicles: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  async getAllVehicles(): Promise<VehicleRecommendation[]> {
    try {
      const data = await apiService.get<VehicleRecommendationsResponse>('/vehicles');
      return data.recommendations || [];
    } catch (error) {
      throw new Error(`Failed to fetch all vehicles: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  async getVehicleById(vehicleId: string): Promise<VehicleRecommendation> {
    try {
      const response = await apiService.get<VehicleRecommendation>(`/vehicles/${vehicleId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch vehicle details: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  async searchVehicles(params: {
    island?: Island;
    startDate?: string;
    endDate?: string;
    priceRange?: [number, number];
    vehicleType?: string;
  }): Promise<VehicleRecommendation[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.island) queryParams.append('island', params.island);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.priceRange) {
        queryParams.append('minPrice', params.priceRange[0].toString());
        queryParams.append('maxPrice', params.priceRange[1].toString());
      }
      if (params.vehicleType) queryParams.append('type', params.vehicleType);

      const url = `/vehicles/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiService.get<VehicleRecommendationsResponse>(url);
      return data.recommendations || [];
    } catch (error) {
      throw new Error(`Failed to search vehicles: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }

  async findSimilarVehicles(vehicleId: string): Promise<VehicleRecommendation[]> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      const similarVehicles = await this.searchVehicles({
        island: vehicle.island,
        vehicleType: vehicle.type,
        priceRange: [vehicle.pricePerDay * 0.8, vehicle.pricePerDay * 1.2] // 20% price range
      });
      
      return similarVehicles.filter(v => v.id !== vehicleId);
    } catch (error) {
      throw new BusinessLogicError(
        'Failed to find similar vehicles',
        'SIMILAR_VEHICLES_FAILED',
        { originalError: error, vehicleId }
      );
    }
  }
}

export const vehicleService = VehicleService.getInstance();