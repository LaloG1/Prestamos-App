import { FontAwesome } from '@expo/vector-icons';
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">E G M - Préstamos!</ThemedText>
      </ThemedView>

      <View style={styles.buttonsContainer}>
        {/* Fila 1: Clientes y Préstamos */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/clientes' as any)}>
            <FontAwesome name="users" size={32} color="white" />
            <Text style={styles.buttonText}>Clientes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/prestamos' as any)}>
            <FontAwesome name="money" size={32} color="white" />
            <Text style={styles.buttonText}>Préstamos</Text>
          </TouchableOpacity>
        </View>

        {/* Fila 2: Cobros */}
        
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    backgroundColor: '#1D3D47',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
