import { openPrestamosDb } from "@/db/prestamos";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

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

const db = SQLite.openDatabaseSync("prestamos.db");

interface Cliente {
  id: number;
  nombre: string;
}

interface Prestamo {
  id: number;
  cliente_id: number;
  cliente_nombre: string; // Lo obtendremos con JOIN
  monto: number;
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
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] =
    useState<Prestamo | null>(null);
  const [acumulados, setAcumulados] = useState<
    { monto_acumulado: number; created_at: string }[]
  >([]);

  const [tienePendiente, setTienePendiente] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [montoOriginal, setMontoOriginal] = useState("");
  const [interes, setInteres] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [notas, setNotas] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "pendiente" | "pagado"
  >("todos");

  const verificarPrestamoPendiente = async (
    clienteId: number
  ): Promise<Prestamo | null> => {
    try {
      const result = await db.getFirstAsync<Prestamo>(
        `SELECT * FROM prestamos WHERE cliente_id = ? AND estado = 'pendiente'`,
        [clienteId]
      );
      return result || null;
    } catch (error) {
      console.log("Error al verificar préstamo pendiente:", error);
      return null;
    }
  };

  const abrirInfoPrestamo = async (prestamo: Prestamo) => {
    setPrestamoSeleccionado(prestamo);
    await fetchAcumulados(prestamo.id); // 🔹 aquí se cargan los acumulados
    setInfoModalVisible(true);
  };

  const [editingPrestamo, setEditingPrestamo] = useState<Prestamo | null>(null);

  useEffect(() => {
    (async () => {
      await openPrestamosDb(db);
      await fetchClientes();
      await fetchPrestamos();
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("🟢 Tab de préstamos enfocada. Recargando datos...");
      fetchPrestamos();
    }, [])
  );

  const fetchAcumulados = async (prestamoId: number) => {
    try {
      const result = await db.getAllAsync<{
        monto_acumulado: number;
        created_at: string;
      }>(
        `SELECT monto_acumulado, created_at FROM acumulados WHERE prestamo_id = ? ORDER BY created_at DESC`,
        [prestamoId]
      );
      setAcumulados(result);
    } catch (error) {
      console.log("Error al obtener acumulados:", error);
    }
  };

  const calcularTotalAcumulado = () => {
    return acumulados.reduce((total, a) => total + a.monto_acumulado, 0);
  };

  const fetchClientes = async (filter: string = "") => {
    try {
      let query = `SELECT id, nombre FROM clientes`;
      let params: any[] = [];
      if (filter.trim() !== "") {
        query += ` WHERE nombre LIKE ?`;
        params.push(`%${filter}%`);
      }
      query += ` ORDER BY nombre`;
      const result = await db.getAllAsync<Cliente>(query, params);
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
      Alert.alert("Error", "Monto inválido.");
      return;
    }
    if (!interes.trim() || isNaN(Number(interes))) {
      Alert.alert("Error", "Interés inválido.");
      return;
    }

    const monto = Number(montoOriginal);
    const interesVal = Number(interes);
    const now = new Date().toISOString();

    try {
      const prestamoPendiente = await verificarPrestamoPendiente(clienteId);

      if (prestamoPendiente) {
        // Cliente ya tiene préstamo pendiente → Insertar en acumulados y actualizar monto
        await db.runAsync(
          `INSERT INTO acumulados (prestamo_id, monto_acumulado, created_at)
         VALUES (?, ?, ?)`,
          [prestamoPendiente.id, monto, now]
        );

        const nuevoMonto = prestamoPendiente.monto + monto;
        await db.runAsync(
          `UPDATE prestamos SET monto = ?, updated_at = ? WHERE id = ?`,
          [nuevoMonto, now, prestamoPendiente.id]
        );

        Alert.alert(
          "Monto Acumulado",
          `El cliente ya tiene un préstamo pendiente.\nEl nuevo monto se ha registrado como acumulado.`
        );
      } else {
        // Cliente sin préstamo pendiente → Insertar nuevo préstamo
        await db.runAsync(
          `INSERT INTO prestamos (cliente_id, monto_original, monto, interes, estado, notas, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [clienteId, monto, monto, interesVal, "pendiente", notas, now, now]
        );
        Alert.alert("Éxito", "Préstamo registrado correctamente.");
      }

      cerrarModal();
      fetchPrestamos();
    } catch (error) {
      console.log("Error al agregar préstamo:", error);
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
    <TouchableOpacity onPress={() => abrirInfoPrestamo(item)}>
      <View style={[styles.row, item.estado === "pagado" && styles.rowPagado]}>
        <Text style={styles.cellN}>{index + 1}</Text>
        <Text style={styles.cell}>{item.cliente_nombre}</Text>
        <Text style={styles.cell}>{item.monto}</Text>
        <Text style={styles.cell}>{item.interes}%</Text>
        <Text style={styles.cell}>{item.estado}</Text>
        <View style={styles.actions}>
          {item.estado !== "pagado" ? (
            <>
              <TouchableOpacity onPress={() => openEditModal(item)}>
                <Text style={[styles.editBtn, { color: "#007bff" }]}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
                <Text style={[styles.deleteBtn, { color: "#dc3545" }]}>🗑️</Text>
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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={async () => {
            setEditingPrestamo(null);
            setClienteId(null);
            setMontoOriginal("");
            setInteres("");
            setEstado("pendiente");
            setNotas("");
            setSearchText("");
            setTienePendiente(false);
            setModalVisible(true);
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Agregar Préstamo</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Buscar cliente por nombre..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => fetchClientes(searchText)}
            style={styles.searchInput}
          />
          {searchText !== "" && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                fetchClientes();
              }}
            >
              <Text style={styles.clearButton}>❌</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setFiltroEstado("todos")}
          >
            <View style={styles.radioCircle}>
              {filtroEstado === "todos" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setFiltroEstado("pendiente")}
          >
            <View style={styles.radioCircle}>
              {filtroEstado === "pendiente" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setFiltroEstado("pagado")}
          >
            <View style={styles.radioCircle}>
              {filtroEstado === "pagado" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>Pagado</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.headerCellN}>#</Text>
          <Text style={styles.headerCell}>Cliente</Text>
          <Text style={styles.headerCell}>Monto Actual</Text>
          <Text style={styles.headerCell}>Interés</Text>
          <Text style={styles.headerCell}>Estado</Text>
          <Text style={styles.headerCellActions}>Acciones</Text>
        </View>

        <FlatList
          data={prestamos.filter((p) => {
            const coincideEstado =
              filtroEstado === "todos" || p.estado === filtroEstado;
            const coincideNombre = p.cliente_nombre
              .toLowerCase()
              .includes(searchText.toLowerCase());
            return coincideEstado && coincideNombre;
          })}
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
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Buscar Cliente:</Text>
                <TextInput
                  placeholder="Escribe el nombre del cliente..."
                  value={
                    clienteId
                      ? clientes.find((c) => c.id === clienteId)?.nombre ||
                        searchText
                      : searchText
                  }
                  onChangeText={(text) => {
                    setSearchText(text);
                    setClienteId(null); // Reinicia selección
                    fetchClientes(text); // Filtra clientes
                  }}
                  style={styles.input}
                />
                {searchText.length > 0 && clienteId === null && (
                  <View style={styles.dropdown}>
                    {clientes.map((cliente) => (
                      <TouchableOpacity
                        key={cliente.id}
                        onPress={async () => {
                          setClienteId(cliente.id);
                          setSearchText(cliente.nombre);
                          const pendiente = await verificarPrestamoPendiente(
                            cliente.id
                          );
                          if (pendiente) {
                            Alert.alert(
                              "Advertencia",
                              "Este cliente ya tiene un préstamo pendiente. El nuevo monto se sumará al existente."
                            );
                            setTienePendiente(true);
                            setInteres(pendiente.interes.toString()); // usar el mismo interés
                          } else {
                            setTienePendiente(false);
                            setInteres(""); // permitir escribir uno nuevo
                          }
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{cliente.nombre}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TextInput
                placeholder="Monto"
                value={montoOriginal}
                onChangeText={setMontoOriginal}
                style={styles.input}
                keyboardType="decimal-pad"
              />
              {tienePendiente ? (
                <View style={[styles.input, { justifyContent: "center" }]}>
                  <Text>Interés actual: {interes}%</Text>
                </View>
              ) : (
                <TextInput
                  placeholder="Interés (%)"
                  value={interes}
                  onChangeText={setInteres}
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              )}

              {editingPrestamo ? (
                <View style={styles.pickerContainer}>
                  <Text style={styles.label}>Estado:</Text>
                  <Picker
                    selectedValue={estado}
                    onValueChange={(itemValue) => setEstado(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Pendiente" value="pendiente" />
                    <Picker.Item label="Pagado" value="pagado" />
                  </Picker>
                </View>
              ) : (
                // Cuando agregas, ocultamos el campo y el estado queda "pendiente" fijo
                <Text style={{ marginBottom: 12 }}>
                  Estado: pendiente (por defecto)
                </Text>
              )}
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
        <Modal
          visible={infoModalVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalBox, { alignItems: "center" }]}>
              <Text style={[styles.modalTitle, { marginBottom: 20 }]}>
                📄 Detalles del Préstamo
              </Text>

              {prestamoSeleccionado && (
                <>
                  <Text
                    style={[
                      styles.infoItem,
                      { fontWeight: "bold", color: "#007bff" },
                    ]}
                  >
                    👤 <Text style={styles.infoLabel}>Cliente:</Text>{" "}
                    {prestamoSeleccionado.cliente_nombre}
                  </Text>
                  <Text style={styles.infoItem}>
                    💰 <Text style={styles.infoLabel}>Monto Original:</Text> $
                    {prestamoSeleccionado.monto_original}
                  </Text>
                  <Text style={styles.infoItem}>
                    💰 <Text style={styles.infoLabel}>Monto Actual:</Text> $
                    {prestamoSeleccionado.monto}
                  </Text>
                  <Text style={styles.infoItem}>
                    📈 <Text style={styles.infoLabel}>Interés:</Text>{" "}
                    {prestamoSeleccionado.interes}%
                  </Text>
                  <Text style={styles.infoItem}>
                    🏷️ <Text style={styles.infoLabel}>Estado:</Text>{" "}
                    {prestamoSeleccionado.estado === "pagado"
                      ? "✅ Pagado"
                      : "⏳ Pendiente"}
                  </Text>
                  <Text style={styles.infoItem}>
                    🗓️ <Text style={styles.infoLabel}>Creado el:</Text>{" "}
                    {new Date(prestamoSeleccionado.created_at).toLocaleString()}
                  </Text>
                  {acumulados.length > 0 && (
                    <>
                      <Text style={[styles.infoLabel, { marginTop: 16 }]}>
                        🧮 Montos Acumulados:
                      </Text>
                      {acumulados.map((a, index) => (
                        <Text key={index} style={styles.infoItem}>
                          ➕ ${a.monto_acumulado} -{" "}
                          {new Date(a.created_at).toLocaleString()}
                        </Text>
                      ))}
                      <Text
                        style={[
                          styles.infoItem,
                          { fontWeight: "bold", color: "#000" },
                        ]}
                      >
                        🔢 Total acumulado: ${calcularTotalAcumulado()}
                      </Text>
                      <Text
                        style={[
                          styles.infoItem,
                          { fontWeight: "bold", color: "#007bff" },
                        ]}
                      >
                        💵 Total general (Original + Acumulado): $
                        {prestamoSeleccionado.monto_original +
                          calcularTotalAcumulado()}
                      </Text>
                    </>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { marginTop: 16, backgroundColor: "#6e7780ff" },
                ]}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cerrar</Text>
              </TouchableOpacity>
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
  infoItem: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "left",
    alignSelf: "stretch",
    color: "#333",
  },
  infoLabel: {
    fontWeight: "bold",
    color: "#000",
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
  rowPagado: {
    backgroundColor: "#e0f0e0", // un verde muy claro
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
    marginBottom: 1,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    height: 55,
  },
  radioGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 20,
  },

  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#007bff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#007bff",
  },
  radioLabel: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  clearButton: {
    fontSize: 18,
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 12,
    position: "relative",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    maxHeight: 150,
    overflow: "scroll",
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
