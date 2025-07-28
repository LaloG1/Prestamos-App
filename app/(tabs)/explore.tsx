import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Button, StyleSheet, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function TabTwoScreen() {
  const compartirBaseDeDatos = async () => {
    try {
      const dbName = "prestamos.db"; // Cambia esto si tu DB tiene otro nombre
      const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      if (!fileInfo.exists) {
        Alert.alert("Error", "No se encontró la base de datos.");
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "No disponible",
          "La función de compartir no está disponible en este dispositivo."
        );
        return;
      }

      await Sharing.shareAsync(dbPath);
    } catch (error) {
      console.error("Error al compartir base de datos:", error);
      Alert.alert("Error", "Hubo un problema al compartir la base de datos.");
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>

      {/* Botón para compartir base de datos */}
      <View style={styles.buttonContainer}>
        <Button
          title="Compartir Base de Datos"
          onPress={compartirBaseDeDatos}
        />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
