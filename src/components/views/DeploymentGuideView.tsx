import React, { useState } from 'react';
import {
  Database,
  Server,
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  FileCode,
  Globe,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function DeploymentGuideView() {
  const { showToast } = useAuth();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    showToast('Copied', `${label} copied to clipboard`, 'info');
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const sqlSchema = `-- ECLPISE DUMP License API - PostgreSQL Database Schema
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash for fast O(1) indexed lookup
    key_display VARCHAR(32) NOT NULL,     -- Masked or plain key representation
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,  -- NULL indicates Lifetime License
    device_limit INTEGER DEFAULT 1,
    devices_used INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    device_binding VARCHAR(64) NOT NULL,
    device_model VARCHAR(150),
    app_version VARCHAR(50),
    ip_address VARCHAR(45),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (license_id, device_binding)
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    license_display VARCHAR(32),
    device_id VARCHAR(64),
    ip_address VARCHAR(45),
    app_version VARCHAR(50),
    error_code VARCHAR(50),
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    latest_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    minimum_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    update_required BOOLEAN DEFAULT FALSE,
    download_url TEXT,
    changelog TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimized B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_key_hash ON licenses(key_hash);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_devices_license ON devices(license_id);
CREATE INDEX IF NOT EXISTS idx_devices_binding ON devices(device_binding);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);`;

  const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://eclipse_user:SuperSecurePostgresPass123!@db:5432/eclipse_dump_db
      - JWT_SECRET=your-random-32-byte-hex-secret-here
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=Admin@Eclipse2026!
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: eclipse_user
      POSTGRES_PASSWORD: SuperSecurePostgresPass123!
      POSTGRES_DB: eclipse_dump_db
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./server/schema.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

volumes:
  pgdata:`;

  const nginxConfig = `server {
    listen 80;
    server_name license.eclipsedump.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name license.eclipsedump.app;

    ssl_certificate /etc/letsencrypt/live/license.eclipsedump.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/license.eclipsedump.app/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">PostgreSQL & Production Deployment</h1>
        <p className="text-sm text-slate-400">
          Database schema DDL, environment variables, Docker Compose, and Nginx HTTPS reverse proxy configurations
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: PostgreSQL DDL Schema */}
        <div className="bg-black/40 border border-indigo-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                1. PostgreSQL DDL Schema Migration (`server/schema.sql`)
              </h2>
              <p className="text-xs text-slate-400">
                Run this SQL in your PostgreSQL instance (Cloud SQL, Supabase, AWS RDS, or local Postgres)
              </p>
            </div>
            <button
              onClick={() => copyText('PostgreSQL Schema', sqlSchema)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
            >
              {copiedItem === 'PostgreSQL Schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedItem === 'PostgreSQL Schema' ? 'Copied SQL' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-white/10 max-h-72 overflow-y-auto">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed">{sqlSchema}</pre>
          </div>
        </div>

        {/* Step 2: Docker Compose */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                2. Docker & Docker-Compose Setup (`docker-compose.yml`)
              </h2>
              <p className="text-xs text-slate-400">
                One-click local or VPS containerized deployment with isolated PostgreSQL and Node.js
              </p>
            </div>
            <button
              onClick={() => copyText('docker-compose.yml', dockerCompose)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 transition-all"
            >
              {copiedItem === 'docker-compose.yml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Compose</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-white/10">
            <pre className="font-mono text-xs text-indigo-200 leading-relaxed">{dockerCompose}</pre>
          </div>
        </div>

        {/* Step 3: Nginx SSL Configuration */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                3. HTTPS & TLS Termination (`/etc/nginx/sites-available/eclipse`)
              </h2>
              <p className="text-xs text-slate-400">
                Strict TLS 1.3 reverse proxy configuration with Let's Encrypt certificates
              </p>
            </div>
            <button
              onClick={() => copyText('Nginx SSL Config', nginxConfig)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 flex items-center gap-1.5 transition-all"
            >
              {copiedItem === 'Nginx SSL Config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Nginx Config</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-white/10">
            <pre className="font-mono text-xs text-indigo-200 leading-relaxed">{nginxConfig}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
