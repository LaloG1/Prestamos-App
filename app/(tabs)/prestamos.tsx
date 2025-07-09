import { openPrestamosDb } from "@/db/prestamos";
import { Picker } from "@react-native-picker/picker";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const db = SQLite.openDatabaseSync("prestamos.db");

interface Cliente {
  id: number;
  nombre: string;
}

interface Prestamo {
  id: number;
  cliente_id: number;
  cliente_nombre: string; // Lo obtendremos con JOIN
  monto_original: number;
  interes: number;
  estado: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export default function PrestamosScreen() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Campos del formulario
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [montoOriginal, setMontoOriginal] = useState("");
  const [interes, setInteres] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [notas, setNotas] = useState("");

  const [editingPrestamo, setEditingPrestamo] = useState<Prestamo | null>(null);

  useEffect(() => {
    (async () => {
      await openPrestamosDb(db);
      await fetchClientes();
      await fetchPrestamos();
    })();
  }, []);

  const fetchClientes = async () => {
    try {
      const result = await db.getAllAsync<Cliente>(
        `SELECT id, nombre FROM clientes ORDER BY nombre`
      );
      setClientes(result);
    } catch (error) {
      console.log("Error al obtener clientes:", error);
    }
  };

  const fetchPrestamos = async () => {
    try {
      // Obtener préstamos con nombre del cliente via JOIN
      const result = await db.getAllAsync<Prestamo>(`
        SELECT p.*, c.nombre as cliente_nombre
        FROM prestamos p
        JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.created_at DESC
      `);
      setPrestamos(result);
    } catch (error) {
      console.log("Error al obtener préstamos:", error);
    }
  };

  const agregarPrestamo = async () => {
    if (!clienteId) {
      Alert.alert("Error", "Selecciona un cliente.");
      return;
    }
    if (!montoOriginal.trim() || isNaN(Number(montoOriginal))) {
      Alert.alert("Error", "Monto original inválido.");
      return;
    }
    if (!interes.trim() || isNaN(Number(interes))) {
      Alert.alert("Error", "Interés inválido.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO prestamos (cliente_id, monto_original, monto, interes, estado, notas, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clienteId,
          Number(montoOriginal),
          Number(montoOriginal), // monto inicial igual a monto_original
          Number(interes),
          estado,
          notas,
          now,
          now,
        ]
      );
      cerrarModal();
      fetchPrestamos();
    } catch (error) {
      console.log("Error al insertar préstamo:", error);
    }
  };

  const actualizarPrestamo = async () => {
    if (!editingPrestamo) return;
    if (!clienteId) {
      Alert.alert("Error", "Selecciona un cliente.");
      return;
    }
    if (!montoOriginal.trim() || isNaN(Number(montoOriginal))) {
      Alert.alert("Error", "Monto original inválido.");
      return;
    }
    if (!interes.trim() || isNaN(Number(interes))) {
      Alert.alert("Error", "Interés inválido.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `UPDATE prestamos SET cliente_id = ?, monto_original = ?, interes = ?, estado = ?, notas = ?, updated_at = ? WHERE id = ?`,
        [
          clienteId,
          Number(montoOriginal),
          Number(interes),
          estado,
          notas,
          now,
          editingPrestamo.id,
        ]
      );
      cerrarModal();
      fetchPrestamos();
    } catch (error) {
      console.log("Error al actualizar préstamo:", error);
    }
  };

  const eliminarPrestamo = async (id: number) => {
    try {
      await db.runAsync(`DELETE FROM prestamos WHERE id = ?`, [id]);
      fetchPrestamos();
    } catch (error) {
      console.log("Error al eliminar préstamo:", error);
    }
  };

  const openEditModal = (prestamo: Prestamo) => {
    setEditingPrestamo(prestamo);
    setClienteId(prestamo.cliente_id);
    setMontoOriginal(prestamo.monto_original.toString());
    setInteres(prestamo.interes.toString());
    setEstado(prestamo.estado);
    setNotas(prestamo.notas || "");
    setModalVisible(true);
  };

  const confirmarEliminar = (id: number) => {
    Alert.alert(
      "Eliminar Préstamo",
      "¿Seguro que quieres eliminar este préstamo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: () => eliminarPrestamo(id),
          style: "destructive",
        },
      ]
    );
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingPrestamo(null);
    setClienteId(null);
    setMontoOriginal("");
    setInteres("");
    setEstado("pendiente");
    setNotas("");
  };

  const renderItem = ({ item, index }: { item: Prestamo; index: number }) => (
    <View style={styles.row}>
      <Text style={styles.cellN}>{index + 1}</Text>
      <Text style={styles.cell}>{item.cliente_nombre}</Text>
      <Text style={styles.cell}>{item.monto_original.toFixed(2)}</Text>
      <Text style={styles.cell}>{item.interes.toFixed(2)}%</Text>
      <Text style={styles.cell}>{item.estado}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Text style={[styles.editBtn, { color: "#007bff" }]}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
          <Text style={[styles.deleteBtn, { color: "#dc3545" }]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => {
            setEditingPrestamo(null);
            setClienteId(null);
            setMontoOriginal("");
            setInteres("");
            setEstado("pendiente");
            setNotas("");
            setModalVisible(true);
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Agregar Préstamo</Text>
        </TouchableOpacity>

        <View style={styles.tableHeader}>
          <Text style={styles.headerCellN}>#</Text>
          <Text style={styles.headerCell}>Cliente</Text>
          <Text style={styles.headerCell}>Monto Original</Text>
          <Text style={styles.headerCell}>Interés</Text>
          <Text style={styles.headerCell}>Estado</Text>
          <Text style={styles.headerCellActions}>Acciones</Text>
        </View>

        <FlatList
          data={prestamos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
        />

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editingPrestamo ? "Editar Préstamo" : "Nuevo Préstamo"}
              </Text>

              {/* Selector Cliente */}
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Cliente:</Text>
                <Picker
                  selectedValue={clienteId}
                  onValueChange={(
                    itemValue: number | null,
                    itemIndex: number
                  ) => setClienteId(Number(itemValue))}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un cliente" value={null} />
                  {clientes.map((c: Cliente) => (
                    <Picker.Item key={c.id} label={c.nombre} value={c.id} />
                  ))}
                </Picker>
              </View>

              <TextInput
                placeholder="Monto Original"
                value={montoOriginal}
                onChangeText={setMontoOriginal}
                style={styles.input}
                keyboardType="decimal-pad"
              />
              <TextInput
                placeholder="Interés (%)"
                value={interes}
                onChangeText={setInteres}
                style={styles.input}
                keyboardType="decimal-pad"
              />
              <TextInput
                placeholder="Estado"
                value={estado}
                onChangeText={setEstado}
                style={styles.input}
              />
              <TextInput
                placeholder="Notas"
                value={notas}
                onChangeText={setNotas}
                style={styles.input}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={
                    editingPrestamo ? actualizarPrestamo : agregarPrestamo
                  }
                  style={styles.saveBtn}
                >
                  <Text style={styles.buttonText}>
                    {editingPrestamo ? "Actualizar" : "Guardar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cerrarModal}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
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
    fontSize: 18,
    marginHorizontal: 4,
  },
  deleteBtn: {
    fontSize: 18,
    marginHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    height: 40,
  },
});
