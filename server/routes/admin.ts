import { Router, Response } from 'express';
import { dbService } from '../db.ts';
import {
  comparePassword,
  hashPassword,
  generateLicenseKey,
  signAdminToken,
} from '../security.ts';
import { requireAdminAuth, AdminAuthRequest, adminLoginLimiter } from '../middleware/auth.ts';

export const adminRouter = Router();

/**
 * POST /api/v1/admin/login
 * Administrator sign-in
 */
adminRouter.post('/login', adminLoginLimiter, async (req: AdminAuthRequest, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required',
    });
  }

  const admin = await dbService.findAdminByUsername(username);
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials',
    });
  }

  const passwordValid = await comparePassword(password, admin.password_hash);
  if (!passwordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials',
    });
  }

  await dbService.updateAdminLastLogin(admin.id);
  const token = signAdminToken({
    id: admin.id,
    username: admin.username,
    role: admin.role,
  });

  return res.json({
    success: true,
    message: 'Authentication successful',
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      last_login: admin.last_login,
    },
  });
});

// All subsequent routes require valid Admin Authentication
adminRouter.use(requireAdminAuth);

/**
 * GET /api/v1/admin/me
 * Returns authenticated administrator info
 */
adminRouter.get('/me', async (req: AdminAuthRequest, res: Response) => {
  const admin = req.admin!;
  return res.json({
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      last_login: admin.last_login,
      created_at: admin.created_at,
    },
  });
});

/**
 * GET /api/v1/admin/stats
 * Dashboard summary statistics
 */
adminRouter.get('/stats', async (_req: AdminAuthRequest, res: Response) => {
  const stats = await dbService.getDashboardStats();
  return res.json({
    success: true,
    stats,
  });
});

/**
 * GET /api/v1/admin/licenses
 * List licenses with search, filter, and pagination
 */
adminRouter.get('/licenses', async (req: AdminAuthRequest, res: Response) => {
  const { search, status, page, limit } = req.query;
  const result = await dbService.listLicenses({
    search: search ? String(search) : undefined,
    status: status ? String(status) : undefined,
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 20,
  });

  return res.json({
    success: true,
    ...result,
  });
});

/**
 * POST /api/v1/admin/licenses/generate
 * Bulk generate random, cryptographically secure license keys
 */
adminRouter.post('/licenses/generate', async (req: AdminAuthRequest, res: Response) => {
  const {
    prefix = 'ECLP',
    count = 1,
    expiration_type = 'days', // 'days' | 'lifetime' | 'custom'
    expiration_days = 30,
    custom_expiry = null,
    device_limit = 1,
    status = 'active',
    notes = '',
    custom_user = '',
    custom_password = '',
  } = req.body || {};

  const generateCount = Math.min(Math.max(parseInt(String(count), 10) || 1, 1), 100);
  const devLimit = Math.min(Math.max(parseInt(String(device_limit), 10) || 1, 1), 20);

  let expiresAt: string | null = null;
  if (expiration_type === 'days' && expiration_days) {
    const days = parseInt(String(expiration_days), 10);
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiration_type === 'custom' && custom_expiry) {
    expiresAt = new Date(custom_expiry).toISOString();
  } else if (expiration_type === 'lifetime') {
    expiresAt = null;
  }

  // Generate unique keys
  const keys: string[] = [];
  for (let i = 0; i < generateCount; i++) {
    keys.push(generateLicenseKey(prefix));
  }

  const created = await dbService.createLicenses(keys, {
    expires_at: expiresAt,
    device_limit: devLimit,
    status: status === 'inactive' ? 'inactive' : 'active',
    notes: String(notes || '').trim(),
    created_by: req.admin?.id,
    custom_user: custom_user ? String(custom_user).trim() : undefined,
    custom_password: custom_password ? String(custom_password).trim() : undefined,
  });

  return res.json({
    success: true,
    message: `Successfully generated ${created.length} license ${created.length === 1 ? 'key' : 'keys'}`,
    licenses: created,
  });
});

/**
 * POST /api/v1/admin/licenses/:id/action
 * Perform single license action (activate, deactivate, ban, unban, reset-device, extend-expiry)
 */
adminRouter.post('/licenses/:id/action', async (req: AdminAuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { action, days, new_expiry } = req.body || {};

  const license = await dbService.findLicenseById(id);
  if (!license) {
    return res.status(404).json({
      success: false,
      error: 'License not found',
    });
  }

  let updated;
  switch (action) {
    case 'activate':
      updated = await dbService.updateLicenseStatus(id, 'active');
      break;
    case 'deactivate':
      updated = await dbService.updateLicenseStatus(id, 'inactive');
      break;
    case 'ban':
      updated = await dbService.updateLicenseStatus(id, 'banned');
      break;
    case 'unban':
      updated = await dbService.updateLicenseStatus(id, 'active');
      break;
    case 'reset_devices':
      await dbService.resetDevicesForLicense(id);
      updated = await dbService.findLicenseById(id);
      break;
    case 'extend_expiry':
      updated = await dbService.extendLicenseExpiry(id, days ? parseInt(days, 10) : null, new_expiry);
      break;
    default:
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}`,
      });
  }

  return res.json({
    success: true,
    message: `Action ${action} completed successfully`,
    license: updated,
  });
});

/**
 * DELETE /api/v1/admin/licenses/:id
 * Delete license and cascade remove bound devices/sessions
 */
adminRouter.delete('/licenses/:id', async (req: AdminAuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleted = await dbService.deleteLicense(id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'License not found',
    });
  }

  return res.json({
    success: true,
    message: 'License deleted successfully',
  });
});

/**
 * GET /api/v1/admin/devices
 * List all registered/bound devices
 */
adminRouter.get('/devices', async (_req: AdminAuthRequest, res: Response) => {
  const devices = await dbService.listAllDevices();
  return res.json({
    success: true,
    devices,
  });
});

/**
 * DELETE /api/v1/admin/devices/:id
 * Unbind / reset a specific device
 */
adminRouter.delete('/devices/:id', async (req: AdminAuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const unbindSuccess = await dbService.unbindDevice(id);
  if (!unbindSuccess) {
    return res.status(404).json({
      success: false,
      error: 'Device not found',
    });
  }

  return res.json({
    success: true,
    message: 'Device unbind successful',
  });
});

/**
 * GET /api/v1/admin/logs
 * View security-relevant audit logs
 */
adminRouter.get('/logs', async (req: AdminAuthRequest, res: Response) => {
  const { search, status, limit } = req.query;
  const logs = await dbService.listApiLogs({
    search: search ? String(search) : undefined,
    status: status ? String(status) : undefined,
    limit: limit ? parseInt(String(limit), 10) : 100,
  });

  return res.json({
    success: true,
    logs,
  });
});

/**
 * DELETE /api/v1/admin/logs
 * Clear audit logs
 */
adminRouter.delete('/logs', async (_req: AdminAuthRequest, res: Response) => {
  await dbService.clearApiLogs();
  return res.json({
    success: true,
    message: 'API logs cleared successfully',
  });
});

/**
 * GET /api/v1/admin/app-version
 * Get app version configuration
 */
adminRouter.get('/app-version', async (_req: AdminAuthRequest, res: Response) => {
  const config = await dbService.getAppVersion();
  return res.json({
    success: true,
    config,
  });
});

/**
 * PUT /api/v1/admin/app-version
 * Update app version configuration
 */
adminRouter.put('/app-version', async (req: AdminAuthRequest, res: Response) => {
  const { latest_version, minimum_version, update_required, download_url, changelog } = req.body || {};
  const updated = await dbService.updateAppVersion({
    ...(latest_version && { latest_version: String(latest_version).trim() }),
    ...(minimum_version && { minimum_version: String(minimum_version).trim() }),
    ...(update_required !== undefined && { update_required: Boolean(update_required) }),
    ...(download_url !== undefined && { download_url: String(download_url).trim() }),
    ...(changelog !== undefined && { changelog: String(changelog).trim() }),
  });

  return res.json({
    success: true,
    message: 'App version updated successfully',
    config: updated,
  });
});

/**
 * PUT /api/v1/admin/profile
 * Update administrator profile and password
 */
adminRouter.put('/profile', async (req: AdminAuthRequest, res: Response) => {
  const adminId = req.admin!.id;
  const { username, current_password, new_password, email } = req.body || {};

  const currentAdmin = await dbService.findAdminById(adminId);
  if (!currentAdmin) {
    return res.status(404).json({ success: false, error: 'Admin not found' });
  }

  let passwordHash = undefined;
  if (new_password) {
    if (!current_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password is required to set a new password',
      });
    }
    const isCurrentValid = await comparePassword(current_password, currentAdmin.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long',
      });
    }
    passwordHash = await hashPassword(new_password);
  }

  const updatedAdmin = await dbService.updateAdminProfile(adminId, {
    username,
    password_hash: passwordHash,
    email,
  });

  return res.json({
    success: true,
    message: 'Profile updated successfully',
    admin: {
      id: updatedAdmin?.id,
      username: updatedAdmin?.username,
      email: updatedAdmin?.email,
      role: updatedAdmin?.role,
    },
  });
});

/**
 * GET /api/v1/admin/export-csv
 * Export all license records as downloadable CSV
 */
adminRouter.get('/export-csv', async (_req: AdminAuthRequest, res: Response) => {
  const csvData = await dbService.exportAllLicensesCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="eclipse-dump-licenses-${Date.now()}.csv"`);
  return res.send(csvData);
});
