import React from 'react';
import { View, StyleSheet, SafeAreaView, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { vehicleService } from '../services/vehicleService';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Island } from '../types';

interface IslandOption {
  id: Island;
  name: string;
  description: string;
  emoji: string;
}

const islands: IslandOption[] = [
  {
    id: 'Nassau',
    name: 'New Providence (Nassau)',
    description: 'Capital city with beaches, resorts, and cultural attractions',
    emoji: '🏙️',
  },
  {
    id: 'Freeport',
    name: 'Grand Bahama (Freeport)',
    description: 'Duty-free shopping, pristine beaches, and water sports',
    emoji: '🏖️',
  },
  {
    id: 'Exuma',
    name: 'Exuma',
    description: 'Swimming pigs, iguanas, and crystal-clear waters',
    emoji: '🐷',
  },
];

interface IslandSelectionScreenProps {
  navigation: any;
}

const IslandSelectionScreen: React.FC<IslandSelectionScreenProps> = ({
  navigation
}) => {
  const { logout } = useAuth();
  // ✅ NO useEffect auth check - App.tsx guarantees we're authenticated

  const handleIslandSelect = async (island: string) => {
    console.log('🏝️ Island selected:', island);
    
    try {
      const vehicles = await vehicleService.getVehiclesByIsland(island as Island);
      navigation.navigate('SearchResults', { island, vehicles });
    } catch (error) {
      console.error('🏝️ Island selection failed:', error);
      
      // Handle session expiration by triggering logout
      if (error instanceof Error && (
        error.message.includes('Session expired') || 
        error.message.includes('Invalid token') || 
        error.message.includes('Unauthorized')
      )) {
        console.log('🚪 Session expired, triggering logout');
        Alert.alert(
          'Session Expired',
          error.message,
          [{ text: 'OK', onPress: logout }]
        );
      } else {
        Alert.alert('Error', `Failed to load vehicles: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
      }
    }
  };


  return (
    <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Select Island" 
          navigation={navigation}
          showBackButton={false}
        />
      
      <View style={styles.content}>
        {/* Your existing island selection UI */}
        <TouchableOpacity
          style={styles.islandButton}
          onPress={() => handleIslandSelect('Nassau')}
        >
          <Text>🏝️ Nassau</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.islandButton}
          onPress={() => handleIslandSelect('Freeport')}
        >
          <Text>🏝️ Freeport</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.islandButton}
          onPress={() => handleIslandSelect('Exuma')}
        >
          <Text>🏝️ Exuma</Text>
        </TouchableOpacity>
        
        {/* Test Chat Button */}
        <TouchableOpacity
          style={[styles.islandButton, { backgroundColor: '#28a745' }]}
          onPress={() => navigation.navigate('Chat', {
            context: {
              participantId: 2 // Test with user ID 2
            },
            title: 'Test Chat'
          })}
        >
          <Text style={{ color: 'white' }}>💬 Test Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default IslandSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  islandButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
});

