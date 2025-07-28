import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

const DB_NAME = 'prestamos.db'; // Nombre de tu base de datos

export default function TabTwoScreen() {
  const shareDatabase = async () => {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);

      if (!fileInfo.exists) {
        Alert.alert('Error', 'No se encontró la base de datos.');
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No disponible', 'No se puede compartir en este dispositivo.');
        return;
      }

      await Sharing.shareAsync(dbPath);
    } catch (error) {
      console.error('Error al compartir la base de datos:', error);
      Alert.alert('Error', 'No se pudo compartir la base de datos.');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.shareButton} onPress={shareDatabase}>
          <Feather name="share-2" size={20} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Compartir base de datos</Text>
        </TouchableOpacity>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
