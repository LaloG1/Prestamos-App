// db/vacaciones.ts
import { SQLiteDatabase } from "expo-sqlite";

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

           
  `);
}
