import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import type {
  AuthUser,
  CustomerItem,
  DriverInfo,
  DriverStatItem,
  InboxMessageItem,
  ShipmentItem,
} from '../types.ts';

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function getDbConfig(): DbConfig | null {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME?.trim() || 'postgres';
  const port = Number(process.env.DB_PORT?.trim() || '5432');

  if (!host || !user || !password) {
    return null;
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 5432,
    database,
    user,
    password,
  };
}

export function getDb(): NodePgDatabase<typeof schema> | null {
  if (dbInstance) return dbInstance;
  const cfg = getDbConfig();
  if (!cfg) return null;

  const isLocal = cfg.host === 'localhost' || cfg.host === '127.0.0.1';
  pool = new Pool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export function isDatabaseConfigured(): boolean {
  return getDbConfig() !== null;
}

export async function ensureSchema(): Promise<{ connected: boolean; mode: 'postgres' | 'memory' }> {
  const db = getDb();
  if (!db || !pool) {
    return { connected: false, mode: 'memory' };
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'dispatcher',
        title TEXT NOT NULL DEFAULT 'Fleet Dispatcher',
        organization TEXT NOT NULL DEFAULT 'JalurKargo.id',
        subscription_plan TEXT NOT NULL DEFAULT 'Pro Subscription',
        avatar_url TEXT NOT NULL DEFAULT '/src/assets/images/avatar_manager_1795325384322.jpg',
        trial_days_left INTEGER NOT NULL DEFAULT 7,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        carrier TEXT NOT NULL,
        phone TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT NOT NULL,
        total_shipments INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        order_code TEXT NOT NULL,
        tracking_ref TEXT NOT NULL,
        shipment_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'IN TRANSIT',
        origin_code TEXT NOT NULL,
        origin_city TEXT NOT NULL,
        origin_time TEXT NOT NULL,
        origin_lat DOUBLE PRECISION NOT NULL,
        origin_lng DOUBLE PRECISION NOT NULL,
        dest_code TEXT NOT NULL,
        dest_city TEXT NOT NULL,
        dest_time TEXT NOT NULL,
        dest_lat DOUBLE PRECISION NOT NULL,
        dest_lng DOUBLE PRECISION NOT NULL,
        current_lat DOUBLE PRECISION NOT NULL,
        current_lng DOUBLE PRECISION NOT NULL,
        progress_pct INTEGER NOT NULL DEFAULT 50,
        dropoff_eta TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        dropoff_tag TEXT NOT NULL,
        driver_id INTEGER REFERENCES drivers(id),
        customer_id INTEGER REFERENCES customers(id),
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shipment_events (
        id SERIAL PRIMARY KEY,
        shipment_record_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        date_label TEXT NOT NULL,
        status_title TEXT NOT NULL,
        time_label TEXT NOT NULL,
        is_completed BOOLEAN NOT NULL DEFAULT TRUE,
        is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS inbox_messages (
        id SERIAL PRIMARY KEY,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        shipment_ref TEXT NOT NULL,
        subject TEXT NOT NULL,
        preview TEXT NOT NULL,
        time_label TEXT NOT NULL,
        unread BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_stats (
        id SERIAL PRIMARY KEY,
        timeframe TEXT NOT NULL UNIQUE,
        on_the_way_pct DOUBLE PRECISION NOT NULL,
        unloading_pct DOUBLE PRECISION NOT NULL,
        loading_pct DOUBLE PRECISION NOT NULL,
        on_the_way_duration TEXT NOT NULL,
        unloading_duration TEXT NOT NULL,
        loading_duration TEXT NOT NULL
      );
    `);

    return { connected: true, mode: 'postgres' };
  } catch (err) {
    console.error('PostgreSQL initialization failed, using in-memory store:', err instanceof Error ? err.message : err);
    dbInstance = null;
    return { connected: false, mode: 'memory' };
  }
}

export interface MemoryApiKey {
  id: number;
  name: string;
  prefix: string;
  keyHash: string;
  createdByUserId: number | null;
  lastUsedAt: string | null;
  createdAt: string;
}

// Memory store fallback used ONLY when DB_HOST/DB_USER/DB_PASSWORD are not configured.
// Starts genuinely empty — populate via External Ingest API (/api/ingest/*) or simulation script.
export interface MemoryState {
  users: (AuthUser & { passwordHash: string })[];
  apiKeys: MemoryApiKey[];
  drivers: DriverInfo[];
  customers: CustomerItem[];
  shipments: ShipmentItem[];
  driverStats: DriverStatItem[];
  inboxMessages: InboxMessageItem[];
  nextId: number;
}

export const memoryStore: MemoryState = {
  users: [],
  apiKeys: [],
  drivers: [],
  customers: [],
  shipments: [],
  driverStats: [],
  inboxMessages: [],
  nextId: 1,
};
