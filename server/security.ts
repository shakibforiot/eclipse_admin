import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'eclipse_dump_default_secret_key_2026_x89q2';
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_SESSION_EXPIRY || '7d';

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash string with SHA-256 (for keys, device tokens, and session tokens)
 */
export function hashSha256(data: string): string {
  return crypto.createHash('sha256').update(data.trim()).digest('hex');
}

/**
 * Generate cryptographically secure random license key formatted like:
 * ECLP-7K9D-X2MQ-8P4A
 */
export function generateLicenseKey(prefix = 'ECLP'): string {
  // Use character set without ambiguous characters (no 0/O, 1/I/L)
  const charset = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const cleanPrefix = (prefix || 'ECLP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ECLP';

  const generateChunk = (length = 4): string => {
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    return result;
  };

  const chunk1 = generateChunk(4);
  const chunk2 = generateChunk(4);
  const chunk3 = generateChunk(4);

  return `${cleanPrefix}-${chunk1}-${chunk2}-${chunk3}`;
}

/**
 * Generate random 64-character session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sign JWT token for admin session
 */
export function signAdminToken(payload: { id: number | string; username: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ADMIN_TOKEN_EXPIRY as any });
}

/**
 * Verify JWT token for admin session
 */
export function verifyAdminToken(token: string): { id: number; username: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string; role?: string };
  } catch {
    return null;
  }
}

/**
 * Compare two semver strings (e.g. "1.0.0" vs "1.2.0")
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  const parts1 = (v1 || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = (v2 || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
