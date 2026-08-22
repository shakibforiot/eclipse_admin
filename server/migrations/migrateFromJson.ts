import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';

export async function migrateJsonToPostgres(pool: Pool): Promise<void> {
  const jsonPath = path.join(process.cwd(), 'data', 'eclipse_dump.json');
  if (!fs.existsSync(jsonPath)) {
    return;
  }

  try {
    const rawContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawContent);

    // 1. Check if admins table has data
    const adminCountRes = await pool.query('SELECT COUNT(*) as count FROM admins');
    const adminCount = parseInt(adminCountRes.rows[0].count, 10);

    if (adminCount === 0 && Array.isArray(data.admins) && data.admins.length > 0) {
      console.log(`[Migration] Migrating ${data.admins.length} admin(s) from JSON to PostgreSQL...`);
      for (const admin of data.admins) {
        if (!admin.username || !admin.password_hash) continue;
        await pool.query(
          `INSERT INTO admins (id, username, password_hash, email, role, last_login, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (username) DO NOTHING`,
          [
            admin.id || null,
            admin.username,
            admin.password_hash,
            admin.email || null,
            admin.role || 'superadmin',
            admin.last_login ? new Date(admin.last_login) : null,
            admin.created_at ? new Date(admin.created_at) : new Date(),
            admin.updated_at ? new Date(admin.updated_at) : new Date(),
          ]
        );
      }
      // Reset sequence
      await pool.query(`SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 1), true)`);
    }

    // 2. Check if licenses table has data
    const licenseCountRes = await pool.query('SELECT COUNT(*) as count FROM licenses');
    const licenseCount = parseInt(licenseCountRes.rows[0].count, 10);

    if (licenseCount === 0 && Array.isArray(data.licenses) && data.licenses.length > 0) {
      console.log(`[Migration] Migrating ${data.licenses.length} license(s) from JSON to PostgreSQL...`);
      for (const lic of data.licenses) {
        if (!lic.key_hash || !lic.key_display) continue;
        await pool.query(
          `INSERT INTO licenses (id, key_hash, key_display, plain_key, status, device_limit, devices_used, expires_at, notes, created_by, created_at, updated_at, last_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (key_hash) DO NOTHING`,
          [
            lic.id || null,
            lic.key_hash,
            lic.key_display,
            lic.plain_key || lic.key_display,
            lic.status || 'active',
            lic.device_limit || 1,
            lic.devices_used || 0,
            lic.expires_at ? new Date(lic.expires_at) : null,
            lic.notes || null,
            lic.created_by || null,
            lic.created_at ? new Date(lic.created_at) : new Date(),
            lic.updated_at ? new Date(lic.updated_at) : new Date(),
            lic.last_login ? new Date(lic.last_login) : null,
          ]
        );
      }
      // Reset sequence
      await pool.query(`SELECT setval('licenses_id_seq', COALESCE((SELECT MAX(id) FROM licenses), 1), true)`);
    }

    // 3. Check if devices table has data
    const deviceCountRes = await pool.query('SELECT COUNT(*) as count FROM devices');
    const deviceCount = parseInt(deviceCountRes.rows[0].count, 10);

    if (deviceCount === 0 && Array.isArray(data.devices) && data.devices.length > 0) {
      console.log(`[Migration] Migrating ${data.devices.length} device(s) from JSON to PostgreSQL...`);
      for (const dev of data.devices) {
        if (!dev.license_id || !dev.device_binding) continue;
        await pool.query(
          `INSERT INTO devices (id, license_id, device_binding, device_model, app_version, ip_address, first_seen, last_seen, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (license_id, device_binding) DO NOTHING`,
          [
            dev.id || null,
            dev.license_id,
            dev.device_binding,
            dev.device_model || 'Android Device',
            dev.app_version || '1.0.0',
            dev.ip_address || '',
            dev.first_seen ? new Date(dev.first_seen) : new Date(),
            dev.last_seen ? new Date(dev.last_seen) : new Date(),
            dev.status || 'active',
          ]
        );
      }
      await pool.query(`SELECT setval('devices_id_seq', COALESCE((SELECT MAX(id) FROM devices), 1), true)`);
    }

    // 4. App Version
    if (data.app_version) {
      const verCountRes = await pool.query('SELECT COUNT(*) as count FROM app_versions');
      const verCount = parseInt(verCountRes.rows[0].count, 10);
      if (verCount === 0) {
        await pool.query(
          `INSERT INTO app_versions (id, latest_version, minimum_version, update_required, download_url, changelog, updated_at)
           VALUES (1, $1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            data.app_version.latest_version || '1.0.0',
            data.app_version.minimum_version || '1.0.0',
            Boolean(data.app_version.update_required),
            data.app_version.download_url || 'https://eclipsedump.app/download',
            data.app_version.changelog || 'Initial release',
            data.app_version.updated_at ? new Date(data.app_version.updated_at) : new Date(),
          ]
        );
      }
    }

    console.log('[Migration] One-time JSON to PostgreSQL migration check complete.');
  } catch (err) {
    console.error('[Migration] Error migrating data from JSON to PostgreSQL:', err);
  }
}
