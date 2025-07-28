import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

import { openPrestamosDb } from "@/db/prestamos"; // ajusta la ruta si es diferente
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type PrestamoConCliente = {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  monto: number;
  estado: string;
};

export default function CobrosScreen() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [prestamos, setPrestamos] = useState<PrestamoConCliente[]>([]);

  useEffect(() => {
    const initDb = async () => {
      const database = await SQLite.openDatabaseAsync("prestamos.db");
      await openPrestamosDb(database);
      setDb(database);
    };

    initDb();
  }, []);

  useEffect(() => {
    if (db) {
      cargarPrestamos();
    }
  }, [db]);

  const cargarPrestamos = async () => {
    try {
      const result = await db!.getAllAsync<PrestamoConCliente>(
        `SELECT p.id, p.cliente_id, p.monto, p.estado, c.nombre as cliente_nombre
         FROM prestamos p
         JOIN clientes c ON p.cliente_id = c.id
         ORDER BY p.id DESC`
      );
      setPrestamos(result);
    } catch (error) {
      console.error("Error al cargar préstamos:", error);
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PrestamoConCliente;
    index: number;
  }) => (
    <TouchableOpacity onPress={() => {}}>
      <View style={[styles.row, item.estado === "pagado" && styles.rowPagado]}>
        <Text style={styles.cellN}>{index + 1}</Text>
        <Text style={styles.cell}>{item.cliente_nombre}</Text>
        <Text style={styles.cell}>{item.monto.toFixed(2)}</Text>
        <Text style={styles.cell}>{item.estado}</Text>
        <View style={styles.actions}>
          {item.estado !== "pagado" ? (
            <>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.editBtn}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.deleteBtn}>🗑️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{ fontSize: 12, color: "#999" }}>✔️ Pagado</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Cobros</ThemedText>
      </ThemedView>

      <View style={styles.tableHeader}>
        <Text style={styles.headerCellN}>#</Text>
        <Text style={styles.headerCell}>Cliente</Text>
        <Text style={styles.headerCell}>Monto</Text>
        <Text style={styles.headerCell}>Estado</Text>
        <Text style={styles.headerCellActions}>Acciones</Text>
      </View>

      <FlatList
        data={prestamos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  titleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 4,
  },
  headerCellN: {
    width: 40,
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  headerCell: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  headerCellActions: {
    width: 80,
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  rowPagado: {
    backgroundColor: "#e0ffe0",
  },
  cellN: {
    width: 40,
    fontSize: 14,
    textAlign: "center",
  },
  cell: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
  },
  actions: {
    width: 80,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  editBtn: {
    color: "#007bff",
    fontSize: 16,
  },
  deleteBtn: {
    color: "#dc3545",
    fontSize: 16,
  },
});
