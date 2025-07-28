import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { SQLiteDatabase } from "expo-sqlite";

// Nombre de la base de datos
const DB_NAME = "prestamos.db";

// Función principal: borra y crea la base de datos
export async function openPrestamosDb(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      notas TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      monto_original REAL NOT NULL,
      interes REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      notas TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prestamo_id INTEGER NOT NULL,
      cliente_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      tipo_pago TEXT NOT NULL,
      fecha_pago TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS acumulados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prestamo_id INTEGER NOT NULL,
      monto_acumulado REAL NOT NULL,
      created_at TEXT,
      FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
    );
  `);
}

// Esta función elimina el archivo .db y vuelve a crearla
export async function resetAndOpenDb(): Promise<SQLiteDatabase> {
  const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

  try {
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      await FileSystem.deleteAsync(dbPath);
      console.log("✅ Base de datos anterior eliminada.");
    } else {
      console.log("ℹ️ No existía base de datos previa.");
    }
  } catch (err) {
    console.warn("⚠️ Error al eliminar base de datos:", err);
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await openPrestamosDb(db);
  console.log("✅ Base de datos nueva creada con todas las tablas.");
  return db;
}
