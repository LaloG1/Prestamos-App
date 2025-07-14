// ClientesScreen.tsx
import { openPrestamosDb } from "@/db/prestamos";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const db = SQLite.openDatabaseSync("prestamos.db");

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  notas: string;
  created_at: string;
  updated_at: string;
}

interface Prestamo {
  id: number;
  cliente_id: number;
  monto: number;
  monto_original: number;
  interes: number;
  estado: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

interface Pago {
  id: number;
  prestamo_id: number;
  cliente_id: number;
  monto: number;
  tipo_pago: string;
  fecha_pago: string;
}

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchText, setSearchText] = useState("");

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [prestamosCliente, setPrestamosCliente] = useState<Prestamo[]>([]);
  const [modalClienteVisible, setModalClienteVisible] = useState(false);

  const [detallePrestamo, setDetallePrestamo] = useState<Prestamo | null>(null);
  const [historialPagos, setHistorialPagos] = useState<Pago[]>([]);

  useEffect(() => {
    (async () => {
      await openPrestamosDb(db);
      fetchClientes();
    })();
  }, []);

  const fetchClientes = async (filter: string = "") => {
    try {
      let query = "SELECT * FROM clientes";
      let params: any[] = [];
      if (filter.trim() !== "") {
        query += " WHERE nombre LIKE ?";
        params.push(`%${filter}%`);
      }
      query += " ORDER BY created_at DESC";
      const result = await db.getAllAsync<Cliente>(query, params);
      setClientes(result);
    } catch (error) {
      console.log("Error al obtener clientes:", error);
    }
  };

  const fetchPrestamosCliente = async (clienteId: number) => {
    try {
      const prestamos = await db.getAllAsync<Prestamo>(
        `SELECT * FROM prestamos WHERE cliente_id = ? ORDER BY created_at DESC`,
        [clienteId]
      );
      setPrestamosCliente(prestamos);
    } catch (error) {
      console.log("Error al obtener préstamos del cliente:", error);
    }
  };

  const verDetallePrestamo = async (prestamoId: number) => {
    try {
      const result = await db.getFirstAsync<Prestamo>(
        `SELECT * FROM prestamos WHERE id = ?`,
        [prestamoId]
      );
      if (!result) {
        Alert.alert("Error", "No se encontró el préstamo.");
        return;
      }
      setDetallePrestamo(result);

      const pagos = await db.getAllAsync<Pago>(
        `SELECT * FROM pagos WHERE prestamo_id = ? ORDER BY fecha_pago DESC`,
        [prestamoId]
      );
      setHistorialPagos(pagos);
    } catch (error) {
      console.log("Error al obtener detalle del préstamo:", error);
    }
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingCliente(null);
    setNombre("");
    setTelefono("");
    setNotas("");
    setSearchText(""); // ← limpia el input
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono);
    setNotas(cliente.notas);
    setModalVisible(true);
  };

  const agregarCliente = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }
    const now = new Date().toISOString();
    try {
      await db.runAsync(
        `INSERT INTO clientes (nombre, telefono, notas, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [nombre, telefono, notas, now, now]
      );
      cerrarModal();
      fetchClientes(searchText);
    } catch (error) {
      console.log("Error al insertar cliente:", error);
    }
  };

  const actualizarCliente = async () => {
    if (!editingCliente || !nombre.trim()) return;
    const now = new Date().toISOString();
    try {
      await db.runAsync(
        `UPDATE clientes SET nombre = ?, telefono = ?, notas = ?, updated_at = ? WHERE id = ?`,
        [nombre, telefono, notas, now, editingCliente.id]
      );
      cerrarModal();
      fetchClientes(searchText);
    } catch (error) {
      console.log("Error al actualizar cliente:", error);
    }
  };

  const eliminarCliente = async (id: number) => {
    try {
      await db.runAsync(`DELETE FROM clientes WHERE id = ?`, [id]);
      fetchClientes(searchText);
    } catch (error) {
      console.log("Error al eliminar cliente:", error);
    }
  };

  const confirmarEliminar = (id: number) => {
    Alert.alert(
      "Eliminar Cliente",
      "¿Estás seguro que deseas eliminar este cliente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: () => eliminarCliente(id),
          style: "destructive",
        },
      ]
    );
  };

  const openClienteModal = (cliente: Cliente) => {
    setDetallePrestamo(null);
    setSelectedCliente(cliente);
    fetchPrestamosCliente(cliente.id);
    setModalClienteVisible(true);
  };

  const renderItem = ({ item, index }: { item: Cliente; index: number }) => (
    <TouchableOpacity onPress={() => openClienteModal(item)}>
      <View style={styles.row}>
        <Text style={styles.cellN}>{index + 1}</Text>
        <Text style={styles.cell}>{item.nombre}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
            <Text style={styles.deleteBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Agregar Cliente</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente por nombre..."
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            fetchClientes(text);
          }}
        />

        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={styles.headerCellN}>#</Text>
              <Text style={styles.headerCell}>Nombre</Text>
              <Text style={styles.headerCellActions}>Acciones</Text>
            </View>
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ marginTop: 20, textAlign: "center", color: "#666" }}>
              No hay clientes registrados.
            </Text>
          }
        />

        {/* Modal de detalle cliente + préstamos + pagos */}
        <Modal
          visible={modalClienteVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalBox, { maxHeight: "85%" }]}>
              {!detallePrestamo ? (
                <ScrollView>
                  <Text style={styles.modalTitle}>Cliente</Text>
                  <Text style={styles.label}>Nombre:</Text>
                  <Text style={styles.textInfo}>{selectedCliente?.nombre}</Text>
                  <Text style={styles.label}>Teléfono:</Text>
                  <Text style={styles.textInfo}>
                    {selectedCliente?.telefono || "-"}
                  </Text>
                  <Text style={styles.label}>Notas:</Text>
                  <Text style={styles.textInfo}>
                    {selectedCliente?.notas || "-"}
                  </Text>

                  <Text style={[styles.modalTitle, { marginTop: 16 }]}>
                    Préstamos
                  </Text>
                  <FlatList
                    data={prestamosCliente}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <View style={[styles.row, { paddingVertical: 6 }]}>
                        <Text style={[styles.cell, { flex: 2 }]}>
                          ${item.monto_original?.toFixed(2)}
                        </Text>
                        <Text style={[styles.cell, { flex: 1 }]}>
                          {item.estado}
                        </Text>
                        <View
                          style={[
                            styles.actions,
                            { flex: 1, justifyContent: "flex-start" },
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => verDetallePrestamo(item.id)}
                          >
                            <Text style={{ fontSize: 18 }}>👁️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={
                      <Text
                        style={{
                          textAlign: "center",
                          marginTop: 12,
                          color: "#666",
                        }}
                      >
                        No hay préstamos para este cliente.
                      </Text>
                    }
                    style={{ maxHeight: 200 }}
                  />
                </ScrollView>
              ) : (
                <ScrollView>
                  <Text style={styles.modalTitle}>Detalle del Préstamo</Text>
                  <Text style={styles.label}>Monto Original:</Text>
                  <Text style={styles.textInfo}>
                    ${detallePrestamo.monto_original?.toFixed(2) ?? "0.00"}
                  </Text>
                  <Text style={styles.label}>Monto Actualizado:</Text>
                  <Text style={styles.textInfo}>
                    ${detallePrestamo.monto?.toFixed(2) ?? "0.00"}
                  </Text>
                  <Text style={styles.label}>Interés:</Text>
                  <Text style={styles.textInfo}>
                    {detallePrestamo.interes ?? 0}%
                  </Text>
                  <Text style={styles.label}>Estado:</Text>
                  <Text style={styles.textInfo}>{detallePrestamo.estado}</Text>
                  <Text style={styles.label}>Notas:</Text>
                  <Text style={styles.textInfo}>
                    {detallePrestamo.notas || "-"}
                  </Text>

                  <Text style={[styles.modalTitle, { marginTop: 16 }]}>
                    Historial de Pagos
                  </Text>
                  {historialPagos.length === 0 ? (
                    <Text style={{ color: "#666" }}>
                      No hay pagos registrados aún.
                    </Text>
                  ) : (
                    historialPagos.map((pago, index) => (
                      <View key={pago.id} style={styles.row}>
                        <Text style={styles.cell}>{index + 1}</Text>
                        <Text style={styles.cell}>
                          ${pago.monto?.toFixed(2)}
                        </Text>
                        <Text style={styles.cell}>{pago.tipo_pago}</Text>
                        <Text style={styles.cell}>{pago.fecha_pago}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={() => {
                  setModalClienteVisible(false);
                  setSearchText("");
                  fetchClientes(""); // recarga todos
                }}
                style={[styles.button, { marginTop: 16 }]}
              >
                <Text style={styles.buttonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de agregar / editar cliente */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
              </Text>
              <Text style={styles.label}>Nombre:</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre del cliente"
              />
              <Text style={styles.label}>Teléfono:</Text>
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Teléfono"
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>Notas:</Text>
              <TextInput
                style={styles.input}
                value={notas}
                onChangeText={setNotas}
                placeholder="Notas"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={editingCliente ? actualizarCliente : agregarCliente}
                >
                  <Text style={styles.buttonText}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={cerrarModal}
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
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
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
  label: {
    fontWeight: "bold",
    marginTop: 8,
  },
  textInfo: {
    fontSize: 16,
    marginBottom: 4,
  },
});
