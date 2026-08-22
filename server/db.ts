import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { hashSha256 } from './security.ts';
import { migrateJsonToPostgres } from './migrations/migrateFromJson.ts';

const { Pool } = pg;

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  email?: string;
  role: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: number;
  key_hash: string;
  key_display: string;
  plain_key: string;
  custom_user?: string;
  custom_password?: string;
  status: 'active' | 'inactive' | 'expired' | 'banned';
  device_limit: number;
  devices_used: number;
  expires_at: string | null; // null = lifetime
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface Device {
  id: number;
  license_id: number;
  device_binding: string;
  device_model?: string;
  app_version?: string;
  ip_address?: string;
  first_seen: string;
  last_seen: string;
  status: 'active' | 'unbound' | 'blocked';
}

export interface Session {
  id: number;
  license_id: number;
  device_id: number;
  token_hash: string;
  revoked: boolean;
  expires_at: string;
  last_active: string;
  created_at: string;
}

export interface ApiLog {
  id: number;
  endpoint: string;
  license_id?: number | null;
  license_display?: string;
  device_id?: string;
  app_version?: string;
  status: 'success' | 'failed' | 'blocked';
  error_code?: string;
  ip_address?: string;
  user_agent?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface AppVersion {
  id: number;
  latest_version: string;
  minimum_version: string;
  update_required: boolean;
  download_url: string;
  changelog: string;
  updated_at: string;
}

// --------------------------------------------------------------------------
// Date Formatter Helper: Formats ISO timestamp to DD/MM/YYYY
// --------------------------------------------------------------------------
export function formatDateDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Lifetime';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getFormattedUserDetails(
  license: License,
  options?: {
    deviceModel?: string;
    appVersion?: string;
    androidVersion?: string;
  }
) {
  let version = options?.androidVersion || options?.deviceModel || (options?.appVersion ? `v${options.appVersion}` : 'Android Version');
  if (options?.androidVersion && options?.deviceModel) {
    version = `${options.androidVersion} (${options.deviceModel})`;
  } else if (!options?.androidVersion && !options?.deviceModel) {
    version = 'Android 14 (API 34)';
  }

  const user = license.custom_user || license.key_display;
  const pass = license.custom_password || license.plain_key || license.key_display;
  const rgtime = formatDateDDMMYYYY(license.created_at);
  const valid = license.expires_at ? formatDateDDMMYYYY(license.expires_at) : 'Lifetime';

  return {
    version,
    user,
    pass,
    rgtime,
    valid,
    status: license.status,
    device_limit: license.device_limit,
    devices_used: license.devices_used,
    license_key: license.key_display,
    expires_at_iso: license.expires_at,
    created_at_iso: license.created_at,
  };
}

// --------------------------------------------------------------------------
// Database Connection Pool & Mode Flag
// --------------------------------------------------------------------------
const isSslEnabled = process.env.PGSSL === 'true' || process.env.PGSSL === 'require' || Boolean(process.env.PGHOST?.includes('render.com'));

let dbHost = process.env.PGHOST || '';
if (dbHost && dbHost.startsWith('dpg-') && !dbHost.includes('.')) {
  dbHost = `${dbHost}.singapore-postgres.render.com`;
}

// We maintain a flag indicating whether PostgreSQL is actively connected
let isPostgresConnected = false;
let postgresLastError: string | null = null;

export const pool = new Pool({
  host: dbHost || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'postgres',
  ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2500, // Fast 2.5s timeout to prevent blocking on startup
});

// Suppress uncaught error events from idle pool clients
pool.on('error', (err) => {
  postgresLastError = err.message || 'PostgreSQL idle client error';
  isPostgresConnected = false;
});

// --------------------------------------------------------------------------
// Local JSON Storage Engine (Fallback for Local / Offline / Sandbox Dev)
// --------------------------------------------------------------------------
interface LocalDbSchema {
  admins: Admin[];
  licenses: License[];
  devices: Device[];
  sessions: Session[];
  api_logs: ApiLog[];
  app_version: AppVersion;
  nextIds: {
    admins: number;
    licenses: number;
    devices: number;
    sessions: number;
    api_logs: number;
  };
}

const dataDir = path.join(process.cwd(), 'data');
const jsonFilePath = path.join(dataDir, 'eclipse_dump.json');

let localDb: LocalDbSchema = {
  admins: [],
  licenses: [],
  devices: [],
  sessions: [],
  api_logs: [],
  app_version: {
    id: 1,
    latest_version: '1.0.0',
    minimum_version: '1.0.0',
    update_required: false,
    download_url: 'https://eclipsedump.app/download',
    changelog: 'Initial release of ECLPISE DUMP with secure license authentication.',
    updated_at: new Date().toISOString(),
  },
  nextIds: {
    admins: 1,
    licenses: 1,
    devices: 1,
    sessions: 1,
    api_logs: 1,
  },
};

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadLocalDb(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(jsonFilePath)) {
      const raw = fs.readFileSync(jsonFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      localDb = {
        admins: Array.isArray(parsed.admins) ? parsed.admins : [],
        licenses: Array.isArray(parsed.licenses) ? parsed.licenses : [],
        devices: Array.isArray(parsed.devices) ? parsed.devices : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        api_logs: Array.isArray(parsed.api_logs) ? parsed.api_logs : [],
        app_version: parsed.app_version || localDb.app_version,
        nextIds: parsed.nextIds || {
          admins: (parsed.admins?.length || 0) + 1,
          licenses: (parsed.licenses?.length || 0) + 1,
          devices: (parsed.devices?.length || 0) + 1,
          sessions: (parsed.sessions?.length || 0) + 1,
          api_logs: (parsed.api_logs?.length || 0) + 1,
        },
      };
    }
  } catch (err) {
    console.error('[LocalStorage] Error reading JSON file, initializing in-memory store:', err);
  }
}

function saveLocalDb(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(jsonFilePath, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LocalStorage] Error saving JSON database:', err);
  }
}

async function initLocalDefaultAdmin(): Promise<void> {
  loadLocalDb();
  if (localDb.admins.length === 0) {
    const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPass, salt);

    const newAdmin: Admin = {
      id: localDb.nextIds.admins++,
      username: defaultUser,
      password_hash: passwordHash,
      email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@eclipsedump.app',
      role: 'superadmin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDb.admins.push(newAdmin);
    saveLocalDb();
    console.log(`[LocalStorage] Created default admin account '${defaultUser}' from environment settings.`);
  }
}

// --------------------------------------------------------------------------
// Data Mappers (PostgreSQL rows to TypeScript interfaces)
// --------------------------------------------------------------------------
function mapAdmin(row: any): Admin {
  return {
    id: Number(row.id),
    username: row.username,
    password_hash: row.password_hash,
    email: row.email || undefined,
    role: row.role || 'superadmin',
    last_login: row.last_login ? new Date(row.last_login).toISOString() : undefined,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function mapLicense(row: any): License {
  return {
    id: Number(row.id),
    key_hash: row.key_hash,
    key_display: row.key_display,
    plain_key: row.plain_key || row.key_display,
    custom_user: row.custom_user || undefined,
    custom_password: row.custom_password || undefined,
    status: row.status,
    device_limit: Number(row.device_limit),
    devices_used: Number(row.devices_used || 0),
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    notes: row.notes || undefined,
    created_by: row.created_by ? Number(row.created_by) : undefined,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    last_login: row.last_login ? new Date(row.last_login).toISOString() : null,
  };
}

function mapDevice(row: any): Device {
  return {
    id: Number(row.id),
    license_id: Number(row.license_id),
    device_binding: row.device_binding,
    device_model: row.device_model || 'Android Device',
    app_version: row.app_version || '1.0.0',
    ip_address: row.ip_address || '',
    first_seen: new Date(row.first_seen).toISOString(),
    last_seen: new Date(row.last_seen).toISOString(),
    status: row.status || 'active',
  };
}

function mapSession(row: any): Session {
  return {
    id: Number(row.id),
    license_id: Number(row.license_id),
    device_id: Number(row.device_id),
    token_hash: row.token_hash,
    revoked: Boolean(row.revoked),
    expires_at: new Date(row.expires_at).toISOString(),
    last_active: new Date(row.last_active).toISOString(),
    created_at: new Date(row.created_at).toISOString(),
  };
}

function mapApiLog(row: any): ApiLog {
  return {
    id: Number(row.id),
    endpoint: row.endpoint,
    license_id: row.license_id ? Number(row.license_id) : null,
    license_display: row.license_display || undefined,
    device_id: row.device_id || undefined,
    app_version: row.app_version || undefined,
    status: row.status,
    error_code: row.error_code || undefined,
    ip_address: row.ip_address || undefined,
    user_agent: row.user_agent || undefined,
    response_time_ms: row.response_time_ms ? Number(row.response_time_ms) : undefined,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function mapAppVersion(row: any): AppVersion {
  return {
    id: Number(row.id),
    latest_version: row.latest_version,
    minimum_version: row.minimum_version,
    update_required: Boolean(row.update_required),
    download_url: row.download_url,
    changelog: row.changelog,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

// --------------------------------------------------------------------------
// Database Initialization
// --------------------------------------------------------------------------
export async function initializeDatabase(): Promise<void> {
  loadLocalDb();
  await initLocalDefaultAdmin();

  // If no PGHOST provided, default to local storage gracefully without connection attempt
  if (!process.env.PGHOST) {
    console.log('[Storage Engine] No PGHOST configured. Running in Local Storage Mode (data/eclipse_dump.json).');
    isPostgresConnected = false;
    return;
  }

  console.log(`[PostgreSQL] Attempting connection to host: ${dbHost}...`);

  try {
    const client = await pool.connect();
    try {
      console.log('[PostgreSQL] Connection verified. Initializing schema tables...');

      await client.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(50) DEFAULT 'superadmin',
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

        CREATE TABLE IF NOT EXISTS licenses (
          id SERIAL PRIMARY KEY,
          key_hash VARCHAR(64) NOT NULL UNIQUE,
          key_display VARCHAR(100) NOT NULL UNIQUE,
          plain_key VARCHAR(100),
          custom_user VARCHAR(100),
          custom_password VARCHAR(100),
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          device_limit INTEGER NOT NULL DEFAULT 1,
          devices_used INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMP WITH TIME ZONE,
          notes TEXT,
          created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_licenses_key_hash ON licenses(key_hash);
        CREATE INDEX IF NOT EXISTS idx_licenses_key_display ON licenses(key_display);
        CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
        CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);

        ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_user VARCHAR(100);
        ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_password VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_licenses_custom_user ON licenses(custom_user);

        CREATE TABLE IF NOT EXISTS devices (
          id SERIAL PRIMARY KEY,
          license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
          device_binding VARCHAR(128) NOT NULL,
          device_model VARCHAR(100),
          app_version VARCHAR(20),
          ip_address VARCHAR(45),
          first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          CONSTRAINT unique_license_device UNIQUE (license_id, device_binding)
        );
        CREATE INDEX IF NOT EXISTS idx_devices_license_id ON devices(license_id);
        CREATE INDEX IF NOT EXISTS idx_devices_device_binding ON devices(device_binding);

        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
          device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          revoked BOOLEAN NOT NULL DEFAULT FALSE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_license_id ON sessions(license_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

        CREATE TABLE IF NOT EXISTS api_logs (
          id SERIAL PRIMARY KEY,
          endpoint VARCHAR(100) NOT NULL,
          license_id INTEGER REFERENCES licenses(id) ON DELETE SET NULL,
          license_display VARCHAR(100),
          device_id VARCHAR(128),
          app_version VARCHAR(20),
          status VARCHAR(20) NOT NULL,
          error_code VARCHAR(50),
          ip_address VARCHAR(45),
          user_agent TEXT,
          response_time_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_api_logs_license_id ON api_logs(license_id);
        CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status);

        CREATE TABLE IF NOT EXISTS app_versions (
          id SERIAL PRIMARY KEY,
          latest_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
          minimum_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
          update_required BOOLEAN NOT NULL DEFAULT FALSE,
          download_url TEXT DEFAULT 'https://eclipsedump.app/download',
          changelog TEXT DEFAULT 'Initial stable release with secure license activation',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure default app version exists
      const appVerRes = await client.query('SELECT id FROM app_versions WHERE id = 1');
      if (appVerRes.rows.length === 0) {
        await client.query(`
          INSERT INTO app_versions (id, latest_version, minimum_version, update_required, download_url, changelog)
          VALUES (1, '1.0.0', '1.0.0', FALSE, 'https://eclipsedump.app/download', 'Initial release of ECLPISE DUMP with secure license authentication.')
          ON CONFLICT (id) DO NOTHING
        `);
      }

      // Ensure administrator exists in Postgres
      const adminCheck = await client.query('SELECT COUNT(*) as count FROM admins');
      const adminCount = parseInt(adminCheck.rows[0].count, 10);
      if (adminCount === 0) {
        const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
        const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin!';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPass, salt);

        await client.query(
          `INSERT INTO admins (username, password_hash, email, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [defaultUser, passwordHash, 'admin@eclipsedump.app', 'superadmin']
        );
        console.log(`[PostgreSQL] Initialized default administrator '${defaultUser}'.`);
      }

      // Run JSON migration if needed
      await migrateJsonToPostgres(pool);

      isPostgresConnected = true;
      postgresLastError = null;
      console.log('[PostgreSQL] Database engine is active and connected.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    isPostgresConnected = false;
    postgresLastError = err.message || 'PostgreSQL Connection Refused';
    console.warn(`[Database Engine] PostgreSQL unavailable (${postgresLastError}). Gracefully using local JSON storage engine.`);
  }
}

// --------------------------------------------------------------------------
// Unified Database Service (PostgreSQL + Automatic JSON Fallback)
// --------------------------------------------------------------------------
class DatabaseService {
  async getHealthStatus() {
    let pgStatus = 'disconnected';
    if (isPostgresConnected) {
      try {
        await pool.query('SELECT 1');
        pgStatus = 'connected';
      } catch (e: any) {
        pgStatus = 'error';
        isPostgresConnected = false;
        postgresLastError = e.message;
      }
    }

    return {
      status: 'healthy',
      storage_mode: isPostgresConnected ? 'postgresql' : 'local_json',
      postgres: {
        connected: isPostgresConnected,
        status: pgStatus,
        host: dbHost || 'none',
        error: postgresLastError,
      },
      local_storage: {
        active: true,
        file: 'data/eclipse_dump.json',
        admins_count: localDb.admins.length,
        licenses_count: localDb.licenses.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Admin Operations
  async findAdminByUsername(username: string): Promise<Admin | null> {
    const cleanUsername = username.trim().toLowerCase();

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          'SELECT * FROM admins WHERE LOWER(username) = LOWER($1) LIMIT 1',
          [cleanUsername]
        );
        if (res.rows.length > 0) return mapAdmin(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findAdminByUsername:', err);
      }
    }

    // Local fallback
    loadLocalDb();
    const admin = localDb.admins.find((a) => a.username.toLowerCase() === cleanUsername);
    return admin || null;
  }

  async findAdminById(id: number): Promise<Admin | null> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
        if (res.rows.length > 0) return mapAdmin(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findAdminById:', err);
      }
    }

    loadLocalDb();
    const admin = localDb.admins.find((a) => a.id === id);
    return admin || null;
  }

  async updateAdminLastLogin(id: number): Promise<void> {
    const now = new Date().toISOString();
    if (isPostgresConnected) {
      try {
        await pool.query(
          'UPDATE admins SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateAdminLastLogin:', err);
      }
    }

    loadLocalDb();
    const admin = localDb.admins.find((a) => a.id === id);
    if (admin) {
      admin.last_login = now;
      admin.updated_at = now;
      saveLocalDb();
    }
  }

  async updateAdminProfile(
    id: number,
    updates: { username?: string; password_hash?: string; email?: string }
  ): Promise<Admin | null> {
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      try {
        const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
        const params: any[] = [];
        let paramIndex = 1;

        if (updates.username) {
          setClauses.push(`username = $${paramIndex++}`);
          params.push(updates.username.trim());
        }
        if (updates.password_hash) {
          setClauses.push(`password_hash = $${paramIndex++}`);
          params.push(updates.password_hash);
        }
        if (updates.email !== undefined) {
          setClauses.push(`email = $${paramIndex++}`);
          params.push(updates.email);
        }

        params.push(id);
        const sql = `UPDATE admins SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const res = await pool.query(sql, params);
        if (res.rows.length > 0) return mapAdmin(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateAdminProfile:', err);
      }
    }

    loadLocalDb();
    const admin = localDb.admins.find((a) => a.id === id);
    if (!admin) return null;

    if (updates.username) admin.username = updates.username.trim();
    if (updates.password_hash) admin.password_hash = updates.password_hash;
    if (updates.email !== undefined) admin.email = updates.email;
    admin.updated_at = now;
    saveLocalDb();
    return admin;
  }

  // License Operations
  async findLicenseByKey(rawKey: string): Promise<License | null> {
    const cleanKey = rawKey.trim();
    const cleanKeyUpper = cleanKey.toUpperCase();
    const cleanKeyLower = cleanKey.toLowerCase();
    const hash = hashSha256(cleanKeyUpper);

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          `SELECT * FROM licenses 
           WHERE key_hash = $1 
              OR UPPER(plain_key) = $2 
              OR UPPER(key_display) = $2 
              OR LOWER(custom_user) = $3 
              OR custom_user = $4
           LIMIT 1`,
          [hash, cleanKeyUpper, cleanKeyLower, cleanKey]
        );

        if (res.rows.length > 0) {
          const license = mapLicense(res.rows[0]);
          if (license.status === 'active' && license.expires_at) {
            if (new Date(license.expires_at).getTime() < Date.now()) {
              await pool.query(
                "UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [license.id]
              );
              license.status = 'expired';
            }
          }
          return license;
        }
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findLicenseByKey:', err);
      }
    }

    // Local fallback
    loadLocalDb();
    const license = localDb.licenses.find(
      (l) =>
        l.key_hash === hash ||
        (l.plain_key && l.plain_key.toUpperCase() === cleanKeyUpper) ||
        l.key_display.toUpperCase() === cleanKeyUpper ||
        (l.custom_user && l.custom_user.toLowerCase() === cleanKeyLower)
    );

    if (!license) return null;

    if (license.status === 'active' && license.expires_at) {
      if (new Date(license.expires_at).getTime() < Date.now()) {
        license.status = 'expired';
        license.updated_at = new Date().toISOString();
        saveLocalDb();
      }
    }

    return license;
  }

  async findLicenseByUserAndPass(user: string, pass: string): Promise<License | null> {
    const cleanUser = user.trim();
    const cleanPass = pass.trim();
    const cleanKeyUpper = cleanUser.toUpperCase();
    const cleanUserLower = cleanUser.toLowerCase();
    const hash = hashSha256(cleanKeyUpper);

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          `SELECT * FROM licenses 
           WHERE (LOWER(custom_user) = LOWER($1) AND (custom_password = $2 OR custom_password IS NULL OR $2 = ''))
              OR (key_hash = $3 AND (plain_key = $2 OR custom_password = $2 OR plain_key = $4 OR $2 = ''))
              OR (UPPER(key_display) = $4 AND (plain_key = $2 OR custom_password = $2 OR $2 = ''))
           LIMIT 1`,
          [cleanUser, cleanPass, hash, cleanKeyUpper]
        );

        if (res.rows.length > 0) {
          const license = mapLicense(res.rows[0]);
          if (license.status === 'active' && license.expires_at) {
            if (new Date(license.expires_at).getTime() < Date.now()) {
              await pool.query(
                "UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [license.id]
              );
              license.status = 'expired';
            }
          }
          return license;
        }
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findLicenseByUserAndPass:', err);
      }
    }

    // Local fallback
    loadLocalDb();
    const license = localDb.licenses.find((l) => {
      const userMatches =
        (l.custom_user && l.custom_user.toLowerCase() === cleanUserLower) ||
        l.key_display.toUpperCase() === cleanKeyUpper ||
        l.key_hash === hash;

      if (!userMatches) return false;
      if (!cleanPass) return true;

      return (
        l.custom_password === cleanPass ||
        l.plain_key === cleanPass ||
        l.key_display === cleanPass ||
        !l.custom_password
      );
    });

    if (!license) return null;

    if (license.status === 'active' && license.expires_at) {
      if (new Date(license.expires_at).getTime() < Date.now()) {
        license.status = 'expired';
        license.updated_at = new Date().toISOString();
        saveLocalDb();
      }
    }

    return license;
  }

  async findLicenseById(id: number): Promise<License | null> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const license = mapLicense(res.rows[0]);
          if (license.status === 'active' && license.expires_at) {
            if (new Date(license.expires_at).getTime() < Date.now()) {
              await pool.query(
                "UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [license.id]
              );
              license.status = 'expired';
            }
          }
          return license;
        }
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findLicenseById:', err);
      }
    }

    loadLocalDb();
    const license = localDb.licenses.find((l) => l.id === id);
    if (!license) return null;

    if (license.status === 'active' && license.expires_at) {
      if (new Date(license.expires_at).getTime() < Date.now()) {
        license.status = 'expired';
        license.updated_at = new Date().toISOString();
        saveLocalDb();
      }
    }

    return license;
  }

  async listLicenses(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search = '', status = 'all', page = 1, limit = 20 } = query;

    if (isPostgresConnected) {
      try {
        await pool.query(
          `UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
        );

        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
          whereClauses.push(`status = $${paramIndex++}`);
          params.push(status);
        }

        if (search.trim()) {
          whereClauses.push(`(key_display ILIKE $${paramIndex} OR custom_user ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
          params.push(`%${search.trim()}%`);
          paramIndex++;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRes = await pool.query(`SELECT COUNT(*) as total FROM licenses ${whereSql}`, params);
        const total = parseInt(countRes.rows[0].count, 10) || 0;

        const offset = (page - 1) * limit;
        const listParams = [...params, limit, offset];
        const listSql = `
          SELECT * FROM licenses
          ${whereSql}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const listRes = await pool.query(listSql, listParams);
        const licenses = listRes.rows.map(mapLicense);

        return {
          licenses,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch (err) {
        console.error('[DB Fallback] Postgres error in listLicenses:', err);
      }
    }

    // Local fallback
    loadLocalDb();
    const now = Date.now();
    localDb.licenses.forEach((l) => {
      if (l.status === 'active' && l.expires_at && new Date(l.expires_at).getTime() < now) {
        l.status = 'expired';
        l.updated_at = new Date().toISOString();
      }
    });

    let filtered = [...localDb.licenses];

    if (status && status !== 'all') {
      filtered = filtered.filter((l) => l.status === status);
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.key_display.toLowerCase().includes(s) ||
          (l.custom_user && l.custom_user.toLowerCase().includes(s)) ||
          (l.notes && l.notes.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      licenses: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createLicenses(
    keys: string[],
    config: {
      expires_at: string | null;
      device_limit: number;
      status: 'active' | 'inactive';
      notes?: string;
      created_by?: number;
      custom_user?: string;
      custom_password?: string;
    }
  ): Promise<License[]> {
    const created: License[] = [];
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const cleanKey = key.trim().toUpperCase();
          const keyHash = hashSha256(cleanKey);

          const customUser = config.custom_user ? (keys.length > 1 ? `${config.custom_user}_${i + 1}` : config.custom_user) : cleanKey;
          const customPassword = config.custom_password || cleanKey;

          const res = await client.query(
            `INSERT INTO licenses (
               key_hash, key_display, plain_key, custom_user, custom_password, status, device_limit, devices_used, expires_at, notes, created_by, created_at, updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
              keyHash,
              cleanKey,
              cleanKey,
              customUser,
              customPassword,
              config.status,
              config.device_limit || 1,
              config.expires_at ? new Date(config.expires_at) : null,
              config.notes || '',
              config.created_by || null,
            ]
          );
          created.push(mapLicense(res.rows[0]));
        }
        await client.query('COMMIT');
        return created;
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[DB Fallback] Postgres error in createLicenses:', err);
      } finally {
        if (client) client.release();
      }
    }

    // Local fallback
    loadLocalDb();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cleanKey = key.trim().toUpperCase();
      const keyHash = hashSha256(cleanKey);

      const customUser = config.custom_user ? (keys.length > 1 ? `${config.custom_user}_${i + 1}` : config.custom_user) : cleanKey;
      const customPassword = config.custom_password || cleanKey;

      const newLic: License = {
        id: localDb.nextIds.licenses++,
        key_hash: keyHash,
        key_display: cleanKey,
        plain_key: cleanKey,
        custom_user: customUser,
        custom_password: customPassword,
        status: config.status,
        device_limit: config.device_limit || 1,
        devices_used: 0,
        expires_at: config.expires_at,
        notes: config.notes || '',
        created_by: config.created_by,
        created_at: now,
        updated_at: now,
        last_login: null,
      };

      localDb.licenses.push(newLic);
      created.push(newLic);
    }
    saveLocalDb();
    return created;
  }

  async updateLicenseStatus(id: number, status: 'active' | 'inactive' | 'expired' | 'banned'): Promise<License | null> {
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          'UPDATE licenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, id]
        );
        if (res.rows.length > 0) return mapLicense(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateLicenseStatus:', err);
      }
    }

    loadLocalDb();
    const license = localDb.licenses.find((l) => l.id === id);
    if (!license) return null;

    license.status = status;
    license.updated_at = now;
    saveLocalDb();
    return license;
  }

  async extendLicenseExpiry(id: number, additionalDays: number | null, newDateStr?: string | null): Promise<License | null> {
    const current = await this.findLicenseById(id);
    if (!current) return null;

    let newExpiresAt: string | null = null;

    if (additionalDays === null || newDateStr === null) {
      newExpiresAt = null; // Lifetime
    } else if (newDateStr) {
      newExpiresAt = new Date(newDateStr).toISOString();
    } else if (additionalDays) {
      const baseTime = current.expires_at ? Math.max(Date.now(), new Date(current.expires_at).getTime()) : Date.now();
      newExpiresAt = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000).toISOString();
    }

    let newStatus = current.status;
    if (current.status === 'expired' && (newExpiresAt === null || new Date(newExpiresAt).getTime() > Date.now())) {
      newStatus = 'active';
    }

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          'UPDATE licenses SET expires_at = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
          [newExpiresAt ? new Date(newExpiresAt) : null, newStatus, id]
        );
        if (res.rows.length > 0) return mapLicense(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in extendLicenseExpiry:', err);
      }
    }

    loadLocalDb();
    const license = localDb.licenses.find((l) => l.id === id);
    if (!license) return null;

    license.expires_at = newExpiresAt;
    license.status = newStatus;
    license.updated_at = new Date().toISOString();
    saveLocalDb();
    return license;
  }

  async deleteLicense(id: number): Promise<boolean> {
    if (isPostgresConnected) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('DELETE FROM devices WHERE license_id = $1', [id]);
        await client.query('DELETE FROM sessions WHERE license_id = $1', [id]);
        const res = await client.query('DELETE FROM licenses WHERE id = $1', [id]);
        await client.query('COMMIT');
        return (res.rowCount ?? 0) > 0;
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[DB Fallback] Postgres error in deleteLicense:', err);
      } finally {
        if (client) client.release();
      }
    }

    loadLocalDb();
    const initialLen = localDb.licenses.length;
    localDb.licenses = localDb.licenses.filter((l) => l.id !== id);
    localDb.devices = localDb.devices.filter((d) => d.license_id !== id);
    localDb.sessions = localDb.sessions.filter((s) => s.license_id !== id);
    saveLocalDb();
    return localDb.licenses.length < initialLen;
  }

  async updateLicenseLastLogin(id: number): Promise<void> {
    const now = new Date().toISOString();
    if (isPostgresConnected) {
      try {
        await pool.query(
          'UPDATE licenses SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateLicenseLastLogin:', err);
      }
    }

    loadLocalDb();
    const license = localDb.licenses.find((l) => l.id === id);
    if (license) {
      license.last_login = now;
      license.updated_at = now;
      saveLocalDb();
    }
  }

  // Device Operations
  async findDevice(licenseId: number, deviceBinding: string): Promise<Device | null> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          'SELECT * FROM devices WHERE license_id = $1 AND device_binding = $2 LIMIT 1',
          [licenseId, deviceBinding]
        );
        if (res.rows.length > 0) return mapDevice(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findDevice:', err);
      }
    }

    loadLocalDb();
    const dev = localDb.devices.find((d) => d.license_id === licenseId && d.device_binding === deviceBinding);
    return dev || null;
  }

  async getDevicesForLicense(licenseId: number): Promise<Device[]> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          "SELECT * FROM devices WHERE license_id = $1 AND status = 'active' ORDER BY last_seen DESC",
          [licenseId]
        );
        return res.rows.map(mapDevice);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in getDevicesForLicense:', err);
      }
    }

    loadLocalDb();
    return localDb.devices
      .filter((d) => d.license_id === licenseId && d.status === 'active')
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
  }

  async bindDevice(params: {
    license_id: number;
    device_binding: string;
    device_model?: string;
    app_version?: string;
    ip_address?: string;
  }): Promise<Device> {
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');

        const existingRes = await client.query(
          'SELECT * FROM devices WHERE license_id = $1 AND device_binding = $2 LIMIT 1',
          [params.license_id, params.device_binding]
        );

        let device: Device;
        if (existingRes.rows.length > 0) {
          const updateRes = await client.query(
            `UPDATE devices
             SET last_seen = CURRENT_TIMESTAMP,
                 status = 'active',
                 device_model = COALESCE($1, device_model),
                 app_version = COALESCE($2, app_version),
                 ip_address = COALESCE($3, ip_address)
             WHERE id = $4
             RETURNING *`,
            [
              params.device_model || null,
              params.app_version || null,
              params.ip_address || null,
              existingRes.rows[0].id,
            ]
          );
          device = mapDevice(updateRes.rows[0]);
        } else {
          const insertRes = await client.query(
            `INSERT INTO devices (
               license_id, device_binding, device_model, app_version, ip_address, status, first_seen, last_seen
             )
             VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
              params.license_id,
              params.device_binding,
              params.device_model || 'Android Device',
              params.app_version || '1.0.0',
              params.ip_address || '',
            ]
          );
          device = mapDevice(insertRes.rows[0]);
        }

        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM devices WHERE license_id = $1 AND status = 'active'",
          [params.license_id]
        );
        const activeCount = parseInt(countRes.rows[0].count, 10) || 0;
        await client.query(
          'UPDATE licenses SET devices_used = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [activeCount, params.license_id]
        );

        await client.query('COMMIT');
        return device;
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[DB Fallback] Postgres error in bindDevice:', err);
      } finally {
        if (client) client.release();
      }
    }

    // Local fallback
    loadLocalDb();
    let device = localDb.devices.find(
      (d) => d.license_id === params.license_id && d.device_binding === params.device_binding
    );

    if (device) {
      device.last_seen = now;
      device.status = 'active';
      if (params.device_model) device.device_model = params.device_model;
      if (params.app_version) device.app_version = params.app_version;
      if (params.ip_address) device.ip_address = params.ip_address;
    } else {
      device = {
        id: localDb.nextIds.devices++,
        license_id: params.license_id,
        device_binding: params.device_binding,
        device_model: params.device_model || 'Android Device',
        app_version: params.app_version || '1.0.0',
        ip_address: params.ip_address || '',
        first_seen: now,
        last_seen: now,
        status: 'active',
      };
      localDb.devices.push(device);
    }

    const activeCount = localDb.devices.filter(
      (d) => d.license_id === params.license_id && d.status === 'active'
    ).length;

    const license = localDb.licenses.find((l) => l.id === params.license_id);
    if (license) {
      license.devices_used = activeCount;
      license.updated_at = now;
    }

    saveLocalDb();
    return device;
  }

  async resetDevicesForLicense(licenseId: number): Promise<boolean> {
    if (isPostgresConnected) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('DELETE FROM devices WHERE license_id = $1', [licenseId]);
        await client.query('DELETE FROM sessions WHERE license_id = $1', [licenseId]);
        await client.query(
          'UPDATE licenses SET devices_used = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [licenseId]
        );
        await client.query('COMMIT');
        return true;
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[DB Fallback] Postgres error in resetDevicesForLicense:', err);
      } finally {
        if (client) client.release();
      }
    }

    loadLocalDb();
    localDb.devices = localDb.devices.filter((d) => d.license_id !== licenseId);
    localDb.sessions = localDb.sessions.filter((s) => s.license_id !== licenseId);
    const lic = localDb.licenses.find((l) => l.id === licenseId);
    if (lic) {
      lic.devices_used = 0;
      lic.updated_at = new Date().toISOString();
    }
    saveLocalDb();
    return true;
  }

  async unbindDevice(deviceId: number): Promise<boolean> {
    if (isPostgresConnected) {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        const devRes = await client.query('SELECT license_id FROM devices WHERE id = $1', [deviceId]);
        if (devRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return false;
        }
        const licenseId = devRes.rows[0].license_id;

        await client.query('DELETE FROM devices WHERE id = $1', [deviceId]);
        await client.query('DELETE FROM sessions WHERE device_id = $1', [deviceId]);

        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM devices WHERE license_id = $1 AND status = 'active'",
          [licenseId]
        );
        const activeCount = parseInt(countRes.rows[0].count, 10) || 0;
        await client.query(
          'UPDATE licenses SET devices_used = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [activeCount, licenseId]
        );

        await client.query('COMMIT');
        return true;
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('[DB Fallback] Postgres error in unbindDevice:', err);
      } finally {
        if (client) client.release();
      }
    }

    loadLocalDb();
    const dev = localDb.devices.find((d) => d.id === deviceId);
    if (!dev) return false;

    const licenseId = dev.license_id;
    localDb.devices = localDb.devices.filter((d) => d.id !== deviceId);
    localDb.sessions = localDb.sessions.filter((s) => s.device_id !== deviceId);

    const activeCount = localDb.devices.filter((d) => d.license_id === licenseId && d.status === 'active').length;
    const lic = localDb.licenses.find((l) => l.id === licenseId);
    if (lic) {
      lic.devices_used = activeCount;
      lic.updated_at = new Date().toISOString();
    }
    saveLocalDb();
    return true;
  }

  async listAllDevices(): Promise<Array<Device & { license_display: string; license_status: string }>> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query(`
          SELECT d.*, 
                 COALESCE(l.key_display, 'Unknown License') as license_display,
                 COALESCE(l.status, 'inactive') as license_status
          FROM devices d
          LEFT JOIN licenses l ON d.license_id = l.id
          ORDER BY d.last_seen DESC
        `);

        return res.rows.map((row) => ({
          ...mapDevice(row),
          license_display: row.license_display,
          license_status: row.license_status,
        }));
      } catch (err) {
        console.error('[DB Fallback] Postgres error in listAllDevices:', err);
      }
    }

    loadLocalDb();
    return localDb.devices
      .map((d) => {
        const lic = localDb.licenses.find((l) => l.id === d.license_id);
        return {
          ...d,
          license_display: lic ? lic.key_display : 'Unknown License',
          license_status: lic ? lic.status : 'inactive',
        };
      })
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
  }

  // Session Operations
  async createSession(params: {
    license_id: number;
    device_id: number;
    token: string;
    expires_at: string;
  }): Promise<Session> {
    const token_hash = hashSha256(params.token);
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          `INSERT INTO sessions (license_id, device_id, token_hash, revoked, expires_at, last_active, created_at)
           VALUES ($1, $2, $3, FALSE, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [params.license_id, params.device_id, token_hash, new Date(params.expires_at)]
        );
        return mapSession(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in createSession:', err);
      }
    }

    loadLocalDb();
    const session: Session = {
      id: localDb.nextIds.sessions++,
      license_id: params.license_id,
      device_id: params.device_id,
      token_hash,
      revoked: false,
      expires_at: params.expires_at,
      last_active: now,
      created_at: now,
    };
    localDb.sessions.push(session);
    saveLocalDb();
    return session;
  }

  async findSessionByToken(token: string): Promise<{ session: Session; license: License; device: Device } | null> {
    const token_hash = hashSha256(token);

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          `SELECT s.*, 
                  l.id as l_id, l.key_hash as l_key_hash, l.key_display as l_key_display, l.plain_key as l_plain_key,
                  l.custom_user as l_custom_user, l.custom_password as l_custom_password,
                  l.status as l_status, l.device_limit as l_device_limit, l.devices_used as l_devices_used,
                  l.expires_at as l_expires_at, l.notes as l_notes, l.created_by as l_created_by,
                  l.created_at as l_created_at, l.updated_at as l_updated_at, l.last_login as l_last_login,
                  d.id as d_id, d.license_id as d_license_id, d.device_binding as d_device_binding,
                  d.device_model as d_device_model, d.app_version as d_app_version, d.ip_address as d_ip_address,
                  d.first_seen as d_first_seen, d.last_seen as d_last_seen, d.status as d_status
           FROM sessions s
           INNER JOIN licenses l ON s.license_id = l.id
           INNER JOIN devices d ON s.device_id = d.id
           WHERE s.token_hash = $1 LIMIT 1`,
          [token_hash]
        );

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const session = mapSession(row);
          const license: License = {
            id: Number(row.l_id),
            key_hash: row.l_key_hash,
            key_display: row.l_key_display,
            plain_key: row.l_plain_key || row.l_key_display,
            custom_user: row.l_custom_user || undefined,
            custom_password: row.l_custom_password || undefined,
            status: row.l_status,
            device_limit: Number(row.l_device_limit),
            devices_used: Number(row.l_devices_used || 0),
            expires_at: row.l_expires_at ? new Date(row.l_expires_at).toISOString() : null,
            notes: row.l_notes || undefined,
            created_by: row.l_created_by ? Number(row.l_created_by) : undefined,
            created_at: new Date(row.l_created_at).toISOString(),
            updated_at: new Date(row.l_updated_at).toISOString(),
            last_login: row.l_last_login ? new Date(row.l_last_login).toISOString() : null,
          };

          const device: Device = {
            id: Number(row.d_id),
            license_id: Number(row.d_license_id),
            device_binding: row.d_device_binding,
            device_model: row.d_device_model || 'Android Device',
            app_version: row.d_app_version || '1.0.0',
            ip_address: row.d_ip_address || '',
            first_seen: new Date(row.d_first_seen).toISOString(),
            last_seen: new Date(row.d_last_seen).toISOString(),
            status: row.d_status || 'active',
          };

          return { session, license, device };
        }
      } catch (err) {
        console.error('[DB Fallback] Postgres error in findSessionByToken:', err);
      }
    }

    loadLocalDb();
    const session = localDb.sessions.find((s) => s.token_hash === token_hash);
    if (!session) return null;

    const license = localDb.licenses.find((l) => l.id === session.license_id);
    const device = localDb.devices.find((d) => d.id === session.device_id);

    if (!license || !device) return null;

    return { session, license, device };
  }

  async revokeSession(token: string): Promise<boolean> {
    const token_hash = hashSha256(token);

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          'UPDATE sessions SET revoked = TRUE WHERE token_hash = $1',
          [token_hash]
        );
        return (res.rowCount ?? 0) > 0;
      } catch (err) {
        console.error('[DB Fallback] Postgres error in revokeSession:', err);
      }
    }

    loadLocalDb();
    const session = localDb.sessions.find((s) => s.token_hash === token_hash);
    if (session) {
      session.revoked = true;
      saveLocalDb();
      return true;
    }
    return false;
  }

  async updateSessionActivity(sessionId: number): Promise<void> {
    const now = new Date().toISOString();
    if (isPostgresConnected) {
      try {
        await pool.query(
          'UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateSessionActivity:', err);
      }
    }

    loadLocalDb();
    const session = localDb.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.last_active = now;
      saveLocalDb();
    }
  }

  // API Logs Operations
  async createApiLog(log: Omit<ApiLog, 'id' | 'created_at'>): Promise<ApiLog> {
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      try {
        const res = await pool.query(
          `INSERT INTO api_logs (
             endpoint, license_id, license_display, device_id, app_version, status, error_code, ip_address, user_agent, response_time_ms, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            log.endpoint,
            log.license_id || null,
            log.license_display || null,
            log.device_id || null,
            log.app_version || null,
            log.status,
            log.error_code || null,
            log.ip_address || null,
            log.user_agent || null,
            log.response_time_ms || null,
          ]
        );
        return mapApiLog(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in createApiLog:', err);
      }
    }

    loadLocalDb();
    const newLog: ApiLog = {
      id: localDb.nextIds.api_logs++,
      endpoint: log.endpoint,
      license_id: log.license_id || null,
      license_display: log.license_display,
      device_id: log.device_id,
      app_version: log.app_version,
      status: log.status,
      error_code: log.error_code,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      response_time_ms: log.response_time_ms,
      created_at: now,
    };

    localDb.api_logs.unshift(newLog);
    if (localDb.api_logs.length > 500) {
      localDb.api_logs = localDb.api_logs.slice(0, 500);
    }
    saveLocalDb();
    return newLog;
  }

  async listApiLogs(query: { search?: string; status?: string; limit?: number }): Promise<ApiLog[]> {
    if (isPostgresConnected) {
      try {
        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (query.status && query.status !== 'all') {
          whereClauses.push(`status = $${paramIndex++}`);
          params.push(query.status);
        }

        if (query.search?.trim()) {
          whereClauses.push(`(endpoint ILIKE $${paramIndex} OR license_display ILIKE $${paramIndex} OR device_id ILIKE $${paramIndex} OR error_code ILIKE $${paramIndex})`);
          params.push(`%${query.search.trim()}%`);
          paramIndex++;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const limit = query.limit || 100;
        params.push(limit);

        const res = await pool.query(
          `SELECT * FROM api_logs ${whereSql} ORDER BY created_at DESC LIMIT $${paramIndex}`,
          params
        );

        return res.rows.map(mapApiLog);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in listApiLogs:', err);
      }
    }

    loadLocalDb();
    let logs = [...localDb.api_logs];

    if (query.status && query.status !== 'all') {
      logs = logs.filter((l) => l.status === query.status);
    }

    if (query.search?.trim()) {
      const s = query.search.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.endpoint.toLowerCase().includes(s) ||
          (l.license_display && l.license_display.toLowerCase().includes(s)) ||
          (l.device_id && l.device_id.toLowerCase().includes(s)) ||
          (l.error_code && l.error_code.toLowerCase().includes(s))
      );
    }

    const limit = query.limit || 100;
    return logs.slice(0, limit);
  }

  async clearApiLogs(): Promise<boolean> {
    if (isPostgresConnected) {
      try {
        await pool.query('TRUNCATE TABLE api_logs RESTART IDENTITY');
        return true;
      } catch (err) {
        console.error('[DB Fallback] Postgres error in clearApiLogs:', err);
      }
    }

    loadLocalDb();
    localDb.api_logs = [];
    saveLocalDb();
    return true;
  }

  // App Version Operations
  async getAppVersion(): Promise<AppVersion> {
    if (isPostgresConnected) {
      try {
        const res = await pool.query('SELECT * FROM app_versions WHERE id = 1 LIMIT 1');
        if (res.rows.length > 0) return mapAppVersion(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in getAppVersion:', err);
      }
    }

    loadLocalDb();
    return localDb.app_version;
  }

  async updateAppVersion(updates: Partial<Omit<AppVersion, 'id' | 'updated_at'>>): Promise<AppVersion> {
    const now = new Date().toISOString();

    if (isPostgresConnected) {
      try {
        const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
        const params: any[] = [];
        let paramIndex = 1;

        if (updates.latest_version !== undefined) {
          setClauses.push(`latest_version = $${paramIndex++}`);
          params.push(updates.latest_version);
        }
        if (updates.minimum_version !== undefined) {
          setClauses.push(`minimum_version = $${paramIndex++}`);
          params.push(updates.minimum_version);
        }
        if (updates.update_required !== undefined) {
          setClauses.push(`update_required = $${paramIndex++}`);
          params.push(Boolean(updates.update_required));
        }
        if (updates.download_url !== undefined) {
          setClauses.push(`download_url = $${paramIndex++}`);
          params.push(updates.download_url);
        }
        if (updates.changelog !== undefined) {
          setClauses.push(`changelog = $${paramIndex++}`);
          params.push(updates.changelog);
        }

        const sql = `UPDATE app_versions SET ${setClauses.join(', ')} WHERE id = 1 RETURNING *`;
        const res = await pool.query(sql, params);
        if (res.rows.length > 0) return mapAppVersion(res.rows[0]);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in updateAppVersion:', err);
      }
    }

    loadLocalDb();
    localDb.app_version = {
      ...localDb.app_version,
      ...updates,
      updated_at: now,
    };
    saveLocalDb();
    return localDb.app_version;
  }

  // Dashboard & Statistics
  async getDashboardStats() {
    if (isPostgresConnected) {
      try {
        await pool.query(
          `UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
        );

        const [licStats, devStats, logStats, log24hStats, recentLogsRes, appVersion] = await Promise.all([
          pool.query(`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'active') as active,
              COUNT(*) FILTER (WHERE status = 'expired') as expired,
              COUNT(*) FILTER (WHERE status = 'banned') as banned,
              COUNT(*) FILTER (WHERE status = 'inactive') as inactive
            FROM licenses
          `),
          pool.query("SELECT COUNT(*) as active_devices FROM devices WHERE status = 'active'"),
          pool.query('SELECT COUNT(*) as total_requests FROM api_logs'),
          pool.query(`
            SELECT COUNT(*) as last_24h_requests
            FROM api_logs
            WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours')
          `),
          pool.query('SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 10'),
          this.getAppVersion(),
        ]);

        const licRow = licStats.rows[0];
        const devRow = devStats.rows[0];
        const logRow = logStats.rows[0];
        const log24hRow = log24hStats.rows[0];

        return {
          totalKeys: parseInt(licRow.total, 10) || 0,
          activeKeys: parseInt(licRow.active, 10) || 0,
          expiredKeys: parseInt(licRow.expired, 10) || 0,
          bannedKeys: parseInt(licRow.banned, 10) || 0,
          inactiveKeys: parseInt(licRow.inactive, 10) || 0,
          activeDevices: parseInt(devRow.active_devices, 10) || 0,
          totalRequests: parseInt(logRow.total_requests, 10) || 0,
          last24hRequests: parseInt(log24hRow.last_24h_requests, 10) || 0,
          recentActivity: recentLogsRes.rows.map(mapApiLog),
          appVersion,
        };
      } catch (err) {
        console.error('[DB Fallback] Postgres error in getDashboardStats:', err);
      }
    }

    // Local fallback
    loadLocalDb();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    localDb.licenses.forEach((l) => {
      if (l.status === 'active' && l.expires_at && new Date(l.expires_at).getTime() < now) {
        l.status = 'expired';
      }
    });

    const activeKeys = localDb.licenses.filter((l) => l.status === 'active').length;
    const expiredKeys = localDb.licenses.filter((l) => l.status === 'expired').length;
    const bannedKeys = localDb.licenses.filter((l) => l.status === 'banned').length;
    const inactiveKeys = localDb.licenses.filter((l) => l.status === 'inactive').length;
    const activeDevices = localDb.devices.filter((d) => d.status === 'active').length;
    const totalRequests = localDb.api_logs.length;
    const last24hRequests = localDb.api_logs.filter((l) => new Date(l.created_at).getTime() >= oneDayAgo).length;

    return {
      totalKeys: localDb.licenses.length,
      activeKeys,
      expiredKeys,
      bannedKeys,
      inactiveKeys,
      activeDevices,
      totalRequests,
      last24hRequests,
      recentActivity: localDb.api_logs.slice(0, 10),
      appVersion: localDb.app_version,
    };
  }

  async exportAllLicensesCSV(): Promise<string> {
    let licenses: License[] = [];

    if (isPostgresConnected) {
      try {
        const res = await pool.query('SELECT * FROM licenses ORDER BY id ASC');
        licenses = res.rows.map(mapLicense);
      } catch (err) {
        console.error('[DB Fallback] Postgres error in exportAllLicensesCSV:', err);
      }
    }

    if (licenses.length === 0) {
      loadLocalDb();
      licenses = [...localDb.licenses].sort((a, b) => a.id - b.id);
    }

    const rows = [
      ['ID', 'License Key', 'Username', 'Password', 'Status', 'Device Limit', 'Devices Used', 'Expires At', 'Notes', 'Created At', 'Last Login'],
      ...licenses.map((l) => [
        l.id,
        l.plain_key || l.key_display,
        l.custom_user || l.key_display,
        l.custom_password || l.plain_key || l.key_display,
        l.status,
        l.device_limit,
        l.devices_used,
        l.expires_at || 'Lifetime',
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.created_at,
        l.last_login || 'Never',
      ]),
    ];
    return rows.map((r) => r.join(',')).join('\n');
  }
}

export const dbService = new DatabaseService();
