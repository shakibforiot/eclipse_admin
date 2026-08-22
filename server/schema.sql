-- ==============================================================================
-- ECLPISE DUMP License API - PostgreSQL Database Schema
-- Production Ready Schema
-- ==============================================================================

-- 1. Admins Table
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

-- 2. Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_display VARCHAR(100) NOT NULL UNIQUE,
    plain_key VARCHAR(100),
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

-- 3. Devices Table (Enforces device binding per license)
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

-- 4. Sessions Table (Short-lived temporary access tokens for Android clients)
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

-- 5. API Logs Table (Security-relevant audit log)
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

-- 6. App Versions Table (Enforces app update policy)
CREATE TABLE IF NOT EXISTS app_versions (
    id SERIAL PRIMARY KEY,
    latest_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    minimum_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    update_required BOOLEAN NOT NULL DEFAULT FALSE,
    download_url TEXT DEFAULT 'https://eclipsedump.app/download',
    changelog TEXT DEFAULT 'Initial stable release with secure license activation',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
