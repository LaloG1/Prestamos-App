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
  const [detallePrestamo, setDetallePrestamo] = useState<Prestamo | null>(null);
  const montoPrestamoActual = detallePrestamo?.monto ?? 0;
  const interes = detallePrestamo?.interes ?? 0;
  const interesEstimado = (montoPrestamoActual * interes) / 100;
  const [listaPrestamos, setListaPrestamos] = useState<Prestamo[]>([]);

  // Estados para modal cliente / préstamo / historial
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [prestamosCliente, setPrestamosCliente] = useState<Prestamo[]>([]);
  const [modalClienteVisible, setModalClienteVisible] = useState(false);

  const [historialPagos, setHistorialPagos] = useState<Pago[]>([]);
  const [mostrarVolver, setMostrarVolver] = useState(true);

  // Control de vistas internas del modal cliente
  const [pantallaModal, setPantallaModal] = useState<
    "cliente" | "detalle" | "historial"
  >("cliente");

  // Formulario pago
  const [mostrarFormularioPago, setMostrarFormularioPago] = useState(false);
  const [tipoPago, setTipoPago] = useState("");
  const [montoPago, setMontoPago] = useState("");
  const [montoActualizado, setMontoActualizado] = useState(0);

  useEffect(() => {
    if (tipoPago === "interes") {
      const interes = Number(interesEstimado);
      setMontoPago(isNaN(interes) ? "" : interes.toFixed(2));
    } else if (tipoPago === "liquidar") {
      const monto = Number(montoActualizado);
      setMontoPago(isNaN(monto) || monto === 0 ? "" : monto.toFixed(2));
    } else {
      setMontoPago("");
    }
  }, [tipoPago, interesEstimado, montoActualizado]);

  const [montoInteres, setMontoInteres] = useState(""); // Agregado para montoInteres
  const [fechaPago, setFechaPago] = useState("");

  useEffect(() => {
    if (!fechaPago) {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      setFechaPago(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await openPrestamosDb(db);
      fetchClientes(searchText);
    })();
  }, [searchText]);

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

      setMostrarFormularioPago(false);
      setPantallaModal("detalle");
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
    setSearchText("");
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

  // Aquí modificamos openClienteModal para resetear estado y abrir modal en vista cliente
  const openClienteModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    fetchPrestamosCliente(cliente.id);
    setPantallaModal("cliente");
    setModalClienteVisible(true);
    setDetallePrestamo(null);
    setHistorialPagos([]);
    setMostrarFormularioPago(false);
  };

  const registrarPago = async () => {
    if (!detallePrestamo) {
      Alert.alert("Error", "No hay préstamo seleccionado.");
      return;
    }

    const monto = parseFloat(montoPago);

    if (isNaN(monto) || monto <= 0) {
      Alert.alert("Error", "Debe ingresar un monto válido.");
      return;
    }

    if (tipoPago !== "interes" && monto > montoActualizado) {
      Alert.alert(
        "Error",
        `El monto no puede ser mayor al monto actualizado: $${montoActualizado.toFixed(
          2
        )}.`
      );
      return;
    }

    const fechaActual = new Date().toISOString().split("T")[0];

    try {
      await openPrestamosDb(db);

      // Insertar el nuevo pago
      await db.runAsync(
        `INSERT INTO pagos (prestamo_id, cliente_id, monto, tipo_pago, fecha_pago)
       VALUES (?, ?, ?, ?, ?)`,
        [
          detallePrestamo.id,
          detallePrestamo.cliente_id,
          monto,
          tipoPago,
          fechaActual,
        ]
      );

      let nuevoMonto = montoActualizado;
      let nuevoEstado = detallePrestamo.estado;

      if (tipoPago === "abono" || tipoPago === "liquidar") {
        nuevoMonto = tipoPago === "liquidar" ? 0 : montoActualizado - monto;
        nuevoEstado = nuevoMonto <= 0 ? "pagado" : "pendiente";

        await db.runAsync(
          `UPDATE prestamos SET monto = ?, estado = ? WHERE id = ?`,
          [nuevoMonto, nuevoEstado, detallePrestamo.id]
        );
      }

      // Recargar historial de pagos
      const pagosActualizados: Pago[] = await db.getAllAsync<Pago>(
        `SELECT * FROM pagos WHERE prestamo_id = ? ORDER BY fecha_pago DESC`,
        [detallePrestamo.id]
      );

      // Obtener préstamo actualizado
      const prestamoActualizado = await db.getFirstAsync<Prestamo | null>(
        `SELECT * FROM prestamos WHERE id = ?`,
        [detallePrestamo.id]
      );

      // Actualizar estado local del detalle
      if (prestamoActualizado) {
        setDetallePrestamo(prestamoActualizado);

        // 🔄 Actualizar el listado general del modal de clientes
        setPrestamosCliente((prev) =>
          prev.map((p) =>
            p.id === prestamoActualizado.id ? prestamoActualizado : p
          )
        );
      }

      setHistorialPagos(pagosActualizados);
      setMontoPago("");
      setMostrarFormularioPago(false);
      Alert.alert("Éxito", "Pago registrado correctamente.");
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      Alert.alert("Error", "Ocurrió un error al registrar el pago.");
    }
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

        {/* TextBox para buscar clientes por nombre y botón para limpiar la busqueda de cliente */}
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

        {/* Modal para agregar o editar cliente */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={cerrarModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editingCliente ? "Editar Cliente" : "Agregar Cliente"}
              </Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                style={styles.input}
                placeholder="Nombre"
              />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                value={telefono}
                onChangeText={setTelefono}
                style={styles.input}
                placeholder="Teléfono"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Notas</Text>
              <TextInput
                value={notas}
                onChangeText={setNotas}
                style={[styles.input, { height: 80 }]}
                placeholder="Notas"
                multiline
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  style={[styles.button, { flex: 1, marginRight: 8 }]}
                  onPress={editingCliente ? actualizarCliente : agregarCliente}
                >
                  <Text style={styles.buttonText}>
                    {editingCliente ? "Actualizar" : "Agregar"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { flex: 1, backgroundColor: "#888" }]}
                  onPress={cerrarModal}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Cliente con detalle préstamo e historial separados */}
        <Modal
          visible={modalClienteVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalClienteVisible(false);
            setSelectedCliente(null);
            setDetallePrestamo(null);
            setHistorialPagos([]);
            setPantallaModal("cliente");
            setMostrarFormularioPago(false);
          }}
        >
          <View style={styles.modalContainer}>
            {pantallaModal === "cliente" && (
              <View style={[styles.modalBox, { maxHeight: "85%" }]}>
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
                  ListHeaderComponent={
                    <View style={styles.tableHeader}>
                      <Text style={[styles.headerCellPrestamo, { flex: 2 }]}>
                        Monto
                      </Text>
                      <Text style={[styles.headerCellPrestamo, { flex: 1 }]}>
                        Estado
                      </Text>
                      <Text style={[styles.headerCellPrestamo, { flex: 1 }]}>
                        Ver
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.row, { paddingVertical: 6 }]}>
                      <Text style={[styles.cellPrestamo, { flex: 2 }]}>
                        ${item.monto_original}
                      </Text>
                      <Text style={[styles.cellPrestamo, { flex: 1 }]}>
                        {item.estado}
                      </Text>
                      <View style={[styles.actions, { flex: 1 }]}>
                        <TouchableOpacity
                          onPress={async () => {
                            await verDetallePrestamo(item.id);
                          }}
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

                <TouchableOpacity
                  style={[styles.button, { marginTop: 16 }]}
                  onPress={() => {
                    setModalClienteVisible(false);
                    setSelectedCliente(null);
                    setDetallePrestamo(null);
                    setHistorialPagos([]);
                    setPantallaModal("cliente");
                    setMostrarFormularioPago(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}

            {pantallaModal === "detalle" && detallePrestamo && (
              <View style={[styles.modalBox, { maxHeight: "85%" }]}>
                <ScrollView>
                  <Text style={styles.modalTitle}>Detalle del Préstamo</Text>

                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.label}>Monto Original:</Text>
                      <Text style={styles.textInfo}>
                        ${detallePrestamo.monto_original}
                      </Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.label}>Monto Actualizado:</Text>
                      <Text style={styles.textInfo}>
                        ${detallePrestamo.monto}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.column}>
                      <Text style={styles.label}>Interés:</Text>
                      <Text style={styles.textInfo}>
                        {detallePrestamo.interes ?? 0}%
                      </Text>
                    </View>
                    <View style={styles.column}>
                      <Text style={styles.label}>Estado:</Text>
                      <Text style={styles.textInfo}>
                        {detallePrestamo.estado}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.columnFull}>
                      <Text style={styles.label}>Notas:</Text>
                      <Text style={styles.textInfo}>
                        {detallePrestamo.notas || "-"}
                      </Text>
                    </View>
                  </View>

                  {!mostrarFormularioPago && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          { marginTop: 16 },
                          detallePrestamo.estado === "pagado" && {
                            backgroundColor: "#ccc",
                          }, // estilo deshabilitado
                        ]}
                        onPress={() => {
                          if (detallePrestamo.estado === "pagado") return; // evita ejecutar acción
                          const fechaHoy = new Date()
                            .toISOString()
                            .split("T")[0];
                          setMontoActualizado(detallePrestamo.monto || 0);
                          setFechaPago(fechaHoy);
                          setMostrarFormularioPago(true);
                          setTipoPago("");
                        }}
                        disabled={detallePrestamo.estado === "pagado"}
                      >
                        <Text style={styles.buttonText}>
                          {detallePrestamo.estado === "pagado"
                            ? "Préstamo Pagado"
                            : "Realizar Pago"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          { marginTop: 8, backgroundColor: "#28a745" },
                        ]}
                        onPress={() => setPantallaModal("historial")}
                      >
                        <Text style={styles.buttonText}>
                          Historial de pagos
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {mostrarFormularioPago && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.modalTitle}>Registrar Pago</Text>

                      <View style={styles.radioGroup}>
                        {["interes", "abono", "liquidar"].map((tipo) => (
                          <TouchableOpacity
                            key={tipo}
                            onPress={() => {
                              setTipoPago(tipo);
                              if (tipo === "liquidar") {
                                setMontoPago(montoActualizado.toString());
                              } else if (tipo === "interes") {
                                setMontoPago(""); // o puedes poner `interesEstimado.toString()` si prefieres
                              } else {
                                setMontoPago("");
                              }
                            }}
                            style={[
                              styles.radio,
                              tipoPago === tipo && styles.radioSelected,
                            ]}
                          >
                            <Text
                              style={[
                                tipoPago === tipo
                                  ? { color: "#fff" }
                                  : { color: "#007bff" },
                              ]}
                            >
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={montoPago}
                        onChangeText={setMontoPago}
                        editable={tipoPago !== "liquidar"} // ❗ Solo editable si NO es "liquidar"
                        placeholder={
                          tipoPago === "interes"
                            ? `${Number(interesEstimado)}`
                            : tipoPago === "liquidar"
                            ? isNaN(Number(montoActualizado))
                              ? "Monto a liquidar no disponible"
                              : `Monto a liquidar: $${Number(montoActualizado)}`
                            : "Ingresa un monto"
                        }
                      />

                      <TextInput
                        placeholder="Fecha de pago (YYYY-MM-DD)"
                        value={fechaPago}
                        onChangeText={setFechaPago}
                        style={styles.input}
                      />

                      <TouchableOpacity
                        style={styles.button}
                        onPress={registrarPago}
                      >
                        <Text style={styles.buttonText}>Registrar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          { backgroundColor: "#888", marginTop: 8 },
                        ]}
                        onPress={() => setMostrarFormularioPago(false)}
                      >
                        <Text style={styles.buttonText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => {
                    setDetallePrestamo(null);
                    setMostrarFormularioPago(false);
                    setPantallaModal("cliente");
                  }}
                  style={[styles.button, { marginTop: 16 }]}
                >
                  <Text style={styles.buttonText}>Volver</Text>
                </TouchableOpacity>
              </View>
            )}

            {pantallaModal === "historial" && (
              <View style={[styles.modalBox, { maxHeight: "85%" }]}>
                <Text style={styles.modalTitle}>Historial de Pagos</Text>
                {historialPagos.length === 0 ? (
                  <Text
                    style={{
                      color: "#666",
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    No hay pagos registrados aún.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.headerCellPrestamo, { flex: 1 }]}>
                        #
                      </Text>
                      <Text style={[styles.headerCellPrestamo, { flex: 2 }]}>
                        Monto
                      </Text>
                      <Text style={[styles.headerCellPrestamo, { flex: 2 }]}>
                        Tipo
                      </Text>
                      <Text style={[styles.headerCellPrestamo, { flex: 3 }]}>
                        Fecha
                      </Text>
                    </View>
                    {[...historialPagos].reverse().map((pago, index) => (
                      <View key={pago.id} style={styles.row}>
                        <Text style={[styles.cellPrestamo, { flex: 1 }]}>
                          {historialPagos.length - index}
                        </Text>
                        <Text style={[styles.cellPrestamo, { flex: 2 }]}>
                          ${pago.monto}
                        </Text>
                        <Text style={[styles.cellPrestamo, { flex: 2 }]}>
                          {pago.tipo_pago}
                        </Text>
                        <Text style={[styles.cellPrestamo, { flex: 3 }]}>
                          {pago.fecha_pago}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={[styles.button, { marginTop: 16 }]}
                  onPress={() => setPantallaModal("detalle")}
                >
                  <Text style={styles.buttonText}>Volver al detalle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff", // Agregado para fondo blanco
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  label: {
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 14,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cellN: {
    flex: 0.5,
    textAlign: "center",
  },
  cell: {
    flex: 3,
  },
  actions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  editBtn: {
    fontSize: 18,
    color: "#007bff",
  },
  deleteBtn: {
    fontSize: 18,
    color: "#dc3545",
  },
  searchContainer: {
    flexDirection: "row",
    marginVertical: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearButton: {
    marginLeft: 8,
    fontSize: 18,
  },
  // Estilos para tabla préstamos e historial
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  headerCellN: {
    flex: 0.5,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  headerCell: {
    flex: 3,
    color: "#fff",
    fontWeight: "bold",
  },
  headerCellActions: {
    flex: 1,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  headerCellPrestamo: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 4,
    textAlign: "center",
  },
  cellPrestamo: {
    paddingHorizontal: 4,
    textAlign: "center",
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  radio: {
    borderWidth: 1,
    borderColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  radioSelected: {
    backgroundColor: "#007bff",
  },
  textInfo: {
    marginBottom: 8,
    fontSize: 16,
    color: "#666",
  },
  columnFull: {
    flex: 1,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
});
