import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import { colors, typography, spacing } from '../styles/theme';
import { VehicleCard } from '../components/VehicleCard';
import { vehicleService } from '../services/vehicleService';
import { VehicleRecommendation, Island } from '../types';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, ROUTES } from '../navigation/routes';

type SearchResultsScreenProps = StackScreenProps<RootStackParamList, typeof ROUTES.SEARCH_RESULTS>;

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({ navigation, route }) => {
  const [vehicles, setVehicles] = useState<VehicleRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { island } = route.params;

  useEffect(() => {
    fetchVehicles();
  }, [island]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        notificationService.error('Please log in to view vehicles', {
          title: 'Authentication Required',
          duration: 4000
        });
        navigation.navigate('Login');
        return;
      }

      const vehicleRecommendations = await vehicleService.getVehiclesByIsland(island as Island);
      setVehicles(vehicleRecommendations);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleVehiclePress = (vehicle: VehicleRecommendation) => {
    navigation.navigate('VehicleDetail', { vehicle: vehicle.vehicle });
  };

  const renderVehicleItem = ({ item }: { item: VehicleRecommendation }) => (
    <VehicleCard 
      vehicle={item.vehicle} 
      onPress={() => handleVehiclePress(item)}
    />
  );

  const renderEmptyState = () => {
    // Show notification when no results are found
    useEffect(() => {
      notificationService.info(`No vehicles available in ${island}`, {
        title: 'No Results',
        duration: 4000,
        action: {
          label: 'Try Another Island',
          handler: async () => navigation.goBack()
        }
      });
    }, []);

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No vehicles available</Text>
        <Text style={styles.emptySubtitle}>
          There are currently no vehicles available in {island}. Please try another island.
        </Text>
      </View>
    );
  };

  const renderError = () => {
    // Show error notification
    useEffect(() => {
      notificationService.error(error || 'Failed to load vehicles', {
        title: 'Error',
        duration: 5000,
        action: {
          label: 'Retry',
          handler: async () => fetchVehicles()
        }
      });
    }, [error]);

    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load vehicles</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding vehicles in {island}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚗 Available in {island}</Text>
        <Text style={styles.subtitle}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item.vehicle.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  title: {
    ...typography.heading1,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    fontSize: 16,
  },
  listContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offWhite,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  errorTitle: {
    ...typography.subheading,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
