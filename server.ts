import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';

import { initializeDatabase, dbService } from './server/db.ts';
import { authRouter } from './server/routes/auth.ts';
import { appRouter } from './server/routes/app.ts';
import { adminRouter } from './server/routes/admin.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Initialize PostgreSQL Database & Run Schemas/Migrations
  try {
    await initializeDatabase();
  } catch (dbErr: any) {
    console.warn('PostgreSQL database initialization notice:', dbErr.message || dbErr);
  }

  // Enable trust proxy for reverse proxies / Cloud Run environment
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow Vite scripts in development/preview iframe
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // System Health Endpoint
  app.get('/api/health', async (_req, res) => {
    const health = await dbService.getHealthStatus();
    res.json({
      app: 'ECLPISE DUMP License API',
      version: '1.0.0',
      ...health,
    });
  });

  // REST API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/app', appRouter);
  app.use('/api/v1/admin', adminRouter);

  // Vite Middleware (Development) vs Static Serving (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ ECLPISE DUMP License API server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to bootstrap ECLPISE DUMP License API server:', err);
  process.exit(1);
});
