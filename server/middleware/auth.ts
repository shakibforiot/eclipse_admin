import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAdminToken } from '../security.ts';
import { dbService, Admin } from '../db.ts';

export interface AdminAuthRequest extends Request {
  admin?: Admin;
}

/**
 * Middleware to require valid Admin JWT Token
 */
export async function requireAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authentication token',
      });
    }

    const token = authHeader.substring(7).trim();
    const decoded = verifyAdminToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Token is invalid or expired',
      });
    }

    const admin = await dbService.findAdminById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Administrator not found',
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Strict Rate Limiter for Android Auth Endpoints
 * Limits each IP to 60 requests per 15 minutes to prevent key bruteforcing
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  },
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/**
 * Rate Limiter for Admin Login
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  },
  message: {
    success: false,
    error: 'Too many admin login attempts. Please try again later.',
  },
});
