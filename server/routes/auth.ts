import { Router, Request, Response } from 'express';
import { dbService, formatDateDDMMYYYY, getFormattedUserDetails } from '../db.ts';
import { generateSessionToken, hashSha256, compareSemver } from '../security.ts';
import { authRateLimiter } from '../middleware/auth.ts';

export const authRouter = Router();

// Apply rate limiting for brute-force protection
authRouter.use(authRateLimiter);

/**
 * Helper to log security API event
 */
async function logApiEvent(params: {
  req: Request;
  endpoint: string;
  licenseId?: number | null;
  licenseDisplay?: string;
  deviceId?: string;
  appVersion?: string;
  status: 'success' | 'failed' | 'blocked';
  errorCode?: string;
  startTime: number;
}) {
  try {
    const ip = (params.req.headers['x-forwarded-for'] as string) || params.req.socket.remoteAddress || '127.0.0.1';
    const userAgent = params.req.headers['user-agent'] || 'ECLPISE-DUMP-Android-Client';
    const duration = Date.now() - params.startTime;

    await dbService.createApiLog({
      endpoint: params.endpoint,
      license_id: params.licenseId || null,
      license_display: params.licenseDisplay || undefined,
      device_id: params.deviceId || undefined,
      app_version: params.appVersion || undefined,
      status: params.status,
      error_code: params.errorCode || undefined,
      ip_address: ip.split(',')[0].trim(),
      user_agent: userAgent,
      response_time_ms: duration,
    });
  } catch (err) {
    console.error('Failed to write API log:', err);
  }
}

/**
 * POST /api/v1/auth/login
 * Main license authentication endpoint for ECLPISE DUMP Android application.
 * Supports authentication via:
 * 1. license_key
 * 2. user + pass (or username + password)
 * 
 * Returns standard tokens AND direct formatted fields:
 * - version: Android/App version
 * - user: Username
 * - pass: Password
 * - rgtime: Registered date (DD/MM/YYYY)
 * - valid: Expiry date (DD/MM/YYYY or Lifetime)
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const body = req.body || {};
  const {
    license_key,
    user,
    pass,
    username,
    password,
    device_id,
    app_version,
    device_model,
    android_version,
  } = body;

  const rawKeyOrUser = license_key || user || username;
  const rawPass = pass || password || '';
  const rawDeviceId = device_id || req.headers['x-device-id'] || 'device_default';

  // 1. Basic Payload Validation
  if (!rawKeyOrUser || typeof rawKeyOrUser !== 'string' || !rawKeyOrUser.trim()) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/login',
      deviceId: String(rawDeviceId),
      appVersion: app_version,
      status: 'failed',
      errorCode: 'MISSING_CREDENTIALS',
      startTime,
    });
    return res.status(400).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'License key or Username is required',
    });
  }

  const cleanKey = String(rawKeyOrUser).trim();
  const cleanDeviceId = String(rawDeviceId).trim();
  const cleanVersion = (app_version || '1.0.0').trim();

  // 2. Check App Version Constraints
  const appVersionConfig = await dbService.getAppVersion();
  if (appVersionConfig.minimum_version) {
    const isOutdated = compareSemver(cleanVersion, appVersionConfig.minimum_version) < 0;
    if (isOutdated && appVersionConfig.update_required) {
      await logApiEvent({
        req,
        endpoint: '/api/v1/auth/login',
        licenseDisplay: cleanKey,
        deviceId: cleanDeviceId,
        appVersion: cleanVersion,
        status: 'blocked',
        errorCode: 'UPDATE_REQUIRED',
        startTime,
      });
      return res.status(426).json({
        success: false,
        code: 'UPDATE_REQUIRED',
        message: 'Your application version is outdated. Please update to continue.',
        latest_version: appVersionConfig.latest_version,
        minimum_version: appVersionConfig.minimum_version,
        download_url: appVersionConfig.download_url,
      });
    }
  }

  // 3. Find License in Database (supports key or user+pass)
  let license = null;
  if (rawPass && typeof rawPass === 'string') {
    license = await dbService.findLicenseByUserAndPass(cleanKey, String(rawPass).trim());
  }
  if (!license) {
    license = await dbService.findLicenseByKey(cleanKey);
  }

  if (!license) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/login',
      licenseDisplay: cleanKey,
      deviceId: cleanDeviceId,
      appVersion: cleanVersion,
      status: 'failed',
      errorCode: 'INVALID_KEY',
      startTime,
    });
    return res.status(401).json({
      success: false,
      code: 'INVALID_KEY',
      message: 'License key or User/Password is invalid',
    });
  }

  // 4. Check Status (Banned, Inactive, Expired)
  if (license.status === 'banned') {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/login',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: cleanDeviceId,
      appVersion: cleanVersion,
      status: 'blocked',
      errorCode: 'BANNED',
      startTime,
    });
    return res.status(403).json({
      success: false,
      code: 'BANNED',
      message: 'License key has been banned',
    });
  }

  if (license.status === 'inactive') {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/login',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: cleanDeviceId,
      appVersion: cleanVersion,
      status: 'failed',
      errorCode: 'INACTIVE',
      startTime,
    });
    return res.status(403).json({
      success: false,
      code: 'INACTIVE',
      message: 'License key is currently deactivated',
    });
  }

  if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at).getTime() < Date.now())) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/login',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: cleanDeviceId,
      appVersion: cleanVersion,
      status: 'failed',
      errorCode: 'EXPIRED',
      startTime,
    });
    return res.status(403).json({
      success: false,
      code: 'EXPIRED',
      message: 'License key has expired',
    });
  }

  // 5. Device Binding Logic
  const deviceBindingHash = hashSha256(`${license.id}:${cleanDeviceId}`);
  const existingDevices = await dbService.getDevicesForLicense(license.id);
  const alreadyBound = existingDevices.find((d) => d.device_binding === deviceBindingHash);

  let targetDevice;
  if (alreadyBound) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    targetDevice = await dbService.bindDevice({
      license_id: license.id,
      device_binding: deviceBindingHash,
      device_model: typeof device_model === 'string' ? device_model : undefined,
      app_version: cleanVersion,
      ip_address: ip.split(',')[0].trim(),
    });
  } else {
    // New device: Check if device limit reached
    if (existingDevices.length >= license.device_limit) {
      await logApiEvent({
        req,
        endpoint: '/api/v1/auth/login',
        licenseId: license.id,
        licenseDisplay: license.key_display,
        deviceId: cleanDeviceId,
        appVersion: cleanVersion,
        status: 'blocked',
        errorCode: 'DEVICE_LIMIT',
        startTime,
      });
      return res.status(403).json({
        success: false,
        code: 'DEVICE_LIMIT',
        message: 'Device limit reached for this license',
        device_limit: license.device_limit,
        devices_used: existingDevices.length,
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    targetDevice = await dbService.bindDevice({
      license_id: license.id,
      device_binding: deviceBindingHash,
      device_model: typeof device_model === 'string' ? device_model : undefined,
      app_version: cleanVersion,
      ip_address: ip.split(',')[0].trim(),
    });
  }

  // 6. Generate Short-Lived Session Token
  const sessionToken = generateSessionToken();
  const defaultSessionDuration = 7 * 24 * 60 * 60 * 1000;
  let sessionExpiresAt = new Date(Date.now() + defaultSessionDuration).toISOString();
  if (license.expires_at) {
    const licExpiryTime = new Date(license.expires_at).getTime();
    if (licExpiryTime < new Date(sessionExpiresAt).getTime()) {
      sessionExpiresAt = license.expires_at;
    }
  }

  await dbService.createSession({
    license_id: license.id,
    device_id: targetDevice.id,
    token: sessionToken,
    expires_at: sessionExpiresAt,
  });

  // Update license last login
  await dbService.updateLicenseLastLogin(license.id);

  // 7. Format exact fields for the Android UI
  const userDetails = getFormattedUserDetails(license, {
    deviceModel: typeof device_model === 'string' ? device_model : undefined,
    appVersion: cleanVersion,
    androidVersion: typeof android_version === 'string' ? android_version : undefined,
  });

  // 8. Successful Response & Logging
  await logApiEvent({
    req,
    endpoint: '/api/v1/auth/login',
    licenseId: license.id,
    licenseDisplay: license.key_display,
    deviceId: cleanDeviceId,
    appVersion: cleanVersion,
    status: 'success',
    startTime,
  });

  return res.json({
    success: true,
    message: 'Authentication successful',
    session_token: sessionToken,
    expires_at: sessionExpiresAt,
    app_version: cleanVersion,
    // Exact requested fields for Android TextViews:
    version: userDetails.version,
    user: userDetails.user,
    pass: userDetails.pass,
    rgtime: userDetails.rgtime,
    valid: userDetails.valid,
    license_info: {
      key: license.key_display,
      user: userDetails.user,
      pass: userDetails.pass,
      status: license.status,
      rgtime: userDetails.rgtime,
      valid: userDetails.valid,
      expires_at: license.expires_at || 'Lifetime',
      device_limit: license.device_limit,
      devices_used: existingDevices.length + (alreadyBound ? 0 : 1),
    },
  });
});

/**
 * POST /api/v1/auth/validate
 * Validates the temporary session token sent by the Android application
 */
authRouter.post('/validate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let sessionToken = req.body?.session_token;
  const deviceId = req.body?.device_id;
  const deviceModel = req.body?.device_model;
  const androidVersion = req.body?.android_version;

  // Also support Authorization: Bearer <session_token>
  if (!sessionToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.substring(7).trim();
  }

  if (!sessionToken || typeof sessionToken !== 'string') {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/validate',
      deviceId: deviceId,
      status: 'failed',
      errorCode: 'MISSING_SESSION_TOKEN',
      startTime,
    });
    return res.status(401).json({
      success: false,
      valid: false,
      code: 'INVALID_SESSION',
      message: 'Session token is required',
    });
  }

  // Find session and related records
  const sessionData = await dbService.findSessionByToken(sessionToken.trim());
  if (!sessionData) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/validate',
      deviceId: deviceId,
      status: 'failed',
      errorCode: 'SESSION_NOT_FOUND',
      startTime,
    });
    return res.status(401).json({
      success: false,
      valid: false,
      code: 'INVALID_SESSION',
      message: 'Session token is invalid or does not exist',
    });
  }

  const { session, license, device } = sessionData;

  // Check if session is revoked
  if (session.revoked) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/validate',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: deviceId,
      status: 'failed',
      errorCode: 'SESSION_REVOKED',
      startTime,
    });
    return res.status(401).json({
      success: false,
      valid: false,
      code: 'SESSION_REVOKED',
      message: 'Session has been revoked or logged out',
    });
  }

  // Check session expiration
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/validate',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: deviceId,
      status: 'failed',
      errorCode: 'SESSION_EXPIRED',
      startTime,
    });
    return res.status(401).json({
      success: false,
      valid: false,
      code: 'SESSION_EXPIRED',
      message: 'Session token has expired. Please re-authenticate.',
    });
  }

  // Check license status
  if (license.status === 'banned') {
    await logApiEvent({
      req,
      endpoint: '/api/v1/auth/validate',
      licenseId: license.id,
      licenseDisplay: license.key_display,
      deviceId: deviceId,
      status: 'blocked',
      errorCode: 'BANNED',
      startTime,
    });
    return res.status(403).json({
      success: false,
      valid: false,
      code: 'BANNED',
      message: 'License key has been banned',
    });
  }

  if (license.status === 'inactive') {
    return res.status(403).json({
      success: false,
      valid: false,
      code: 'INACTIVE',
      message: 'License key is inactive',
    });
  }

  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    return res.status(403).json({
      success: false,
      valid: false,
      code: 'EXPIRED',
      message: 'License key has expired',
    });
  }

  // Check device binding match if deviceId is provided
  if (deviceId && typeof deviceId === 'string') {
    const expectedBinding = hashSha256(`${license.id}:${deviceId.trim()}`);
    if (device.device_binding !== expectedBinding) {
      await logApiEvent({
        req,
        endpoint: '/api/v1/auth/validate',
        licenseId: license.id,
        licenseDisplay: license.key_display,
        deviceId: deviceId,
        status: 'blocked',
        errorCode: 'DEVICE_MISMATCH',
        startTime,
      });
      return res.status(403).json({
        success: false,
        valid: false,
        code: 'DEVICE_MISMATCH',
        message: 'Session does not match the bound device',
      });
    }
  }

  // Update session & device activity
  await dbService.updateSessionActivity(session.id);
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  await dbService.bindDevice({
    license_id: license.id,
    device_binding: device.device_binding,
    ip_address: ip.split(',')[0].trim(),
  });

  const userDetails = getFormattedUserDetails(license, {
    deviceModel: deviceModel || device.device_model,
    appVersion: device.app_version,
    androidVersion: androidVersion,
  });

  return res.json({
    success: true,
    message: 'Session is valid',
    version: userDetails.version,
    user: userDetails.user,
    pass: userDetails.pass,
    rgtime: userDetails.rgtime,
    valid: userDetails.valid,
    valid_until: userDetails.valid,
    license_status: license.status,
    license_key: license.key_display,
    expires_at: session.expires_at,
  });
});

/**
 * GET & POST /api/v1/auth/user-details
 * Returns the exact 5 fields requested for Android UI:
 * - version: "Android 14 (API 34)"
 * - user: "Username"
 * - pass: "Password"
 * - rgtime: "00/00/0000"
 * - valid: "00/00/0000" or "Lifetime"
 */
async function handleUserDetails(req: Request, res: Response) {
  const query = req.query || {};
  const body = req.body || {};

  let sessionToken = body.session_token || query.session_token;
  const key = body.license_key || query.license_key || body.key || query.key;
  const user = body.user || query.user || body.username || query.username;
  const pass = body.pass || query.pass || body.password || query.password;
  const deviceModel = body.device_model || query.device_model;
  const androidVersion = body.android_version || query.android_version;

  if (!sessionToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.substring(7).trim();
  }

  let license = null;

  if (sessionToken) {
    const sessionData = await dbService.findSessionByToken(String(sessionToken).trim());
    if (sessionData && !sessionData.session.revoked) {
      license = sessionData.license;
    }
  }

  if (!license && user && pass) {
    license = await dbService.findLicenseByUserAndPass(String(user).trim(), String(pass).trim());
  }

  if (!license && (key || user)) {
    const lookup = String(key || user).trim();
    license = await dbService.findLicenseByKey(lookup);
  }

  if (!license) {
    return res.status(404).json({
      success: false,
      message: 'License or user details not found',
      version: androidVersion || 'Android Version',
      user: 'N/A',
      pass: 'N/A',
      rgtime: '00/00/0000',
      valid: '00/00/0000',
    });
  }

  const details = getFormattedUserDetails(license, {
    deviceModel: typeof deviceModel === 'string' ? deviceModel : undefined,
    androidVersion: typeof androidVersion === 'string' ? androidVersion : undefined,
  });

  return res.json({
    success: true,
    version: details.version,
    user: details.user,
    pass: details.pass,
    rgtime: details.rgtime,
    valid: details.valid,
    status: details.status,
    license_key: details.license_key,
  });
}

authRouter.get('/user-details', handleUserDetails);
authRouter.post('/user-details', handleUserDetails);

/**
 * POST /api/v1/auth/logout
 * Invalidate the current session token
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  let sessionToken = req.body?.session_token;
  if (!sessionToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.substring(7).trim();
  }

  if (sessionToken && typeof sessionToken === 'string') {
    await dbService.revokeSession(sessionToken.trim());
  }

  return res.json({
    success: true,
    message: 'Session invalidated successfully',
  });
});
