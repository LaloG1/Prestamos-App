import { openPrestamosDb } from "@/db/prestamos";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from 'react-native-safe-area-context';

const db = SQLite.openDatabaseSync("prestamos.db");

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  notas: string;
  created_at: string;
  updated_at: string;
}

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    (async () => {
      await openPrestamosDb(db);
      fetchClientes();
    })();
  }, []);

  const fetchClientes = async () => {
    try {
      const result = await db.getAllAsync<Cliente>(
        "SELECT * FROM clientes ORDER BY created_at DESC"
      );
      setClientes(result);
    } catch (error) {
      console.log("Error al obtener clientes:", error);
    }
  };

  const agregarCliente = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, telefono, notas, now, now]
      );
      cerrarModal();
      fetchClientes();
    } catch (error) {
      console.log("Error al insertar cliente:", error);
    }
  };

  const actualizarCliente = async () => {
    if (!editingCliente) return;
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `UPDATE clientes SET nombre = ?, telefono = ?, notas = ?, updated_at = ? WHERE id = ?`,
        [nombre, telefono, notas, now, editingCliente.id]
      );
      cerrarModal();
      fetchClientes();
    } catch (error) {
      console.log("Error al actualizar cliente:", error);
    }
  };

  const eliminarCliente = async (id: number) => {
    try {
      await db.runAsync(`DELETE FROM clientes WHERE id = ?`, [id]);
      fetchClientes();
    } catch (error) {
      console.log("Error al eliminar cliente:", error);
    }
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono);
    setNotas(cliente.notas);
    setModalVisible(true);
  };

  const confirmarEliminar = (id: number) => {
    Alert.alert("Eliminar Cliente", "¿Estás seguro que deseas eliminar este cliente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        onPress: () => eliminarCliente(id),
        style: "destructive",
      },
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingCliente(null);
    setNombre("");
    setTelefono("");
    setNotas("");
  };

  const renderItem = ({ item, index }: { item: Cliente; index: number }) => (
    <View style={styles.row}>
      <Text style={styles.cellN}>{index + 1}</Text>
      <Text style={styles.cell}>{item.nombre}</Text>
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
          setEditingCliente(null);
          setNombre("");
          setTelefono("");
          setNotas("");
          setModalVisible(true);
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Agregar Cliente</Text>
      </TouchableOpacity>

      <View style={styles.tableHeader}>
        <Text style={styles.headerCellN}>#</Text>
        <Text style={styles.headerCell}>Nombre</Text>
        <Text style={styles.headerCellActions}>Acciones</Text>
      </View>

      <FlatList
        data={clientes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
            </Text>
            <TextInput
              placeholder="Nombre"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
            />
            <TextInput
              placeholder="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Notas"
              value={notas}
              onChangeText={setNotas}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={editingCliente ? actualizarCliente : agregarCliente}
                style={styles.saveBtn}
              >
                <Text style={styles.buttonText}>
                  {editingCliente ? "Actualizar" : "Guardar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cerrarModal} style={styles.cancelBtn}>
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
});
