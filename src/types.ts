export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  last_login?: string;
  created_at?: string;
}

export interface LicenseItem {
  id: number;
  key_hash: string;
  key_display: string;
  plain_key: string;
  custom_user?: string;
  custom_password?: string;
  status: 'active' | 'inactive' | 'expired' | 'banned';
  device_limit: number;
  devices_used: number;
  expires_at: string | null;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface DeviceItem {
  id: number;
  license_id: number;
  license_display?: string;
  license_status?: string;
  device_binding: string;
  device_model?: string;
  app_version?: string;
  ip_address?: string;
  first_seen: string;
  last_seen: string;
  status: 'active' | 'unbound' | 'blocked';
}

export interface ApiLogItem {
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

export interface AppVersionConfig {
  id?: number;
  latest_version: string;
  minimum_version: string;
  update_required: boolean;
  download_url: string;
  changelog: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  bannedKeys: number;
  inactiveKeys: number;
  activeDevices: number;
  totalRequests: number;
  last24hRequests: number;
  recentActivity: ApiLogItem[];
  appVersion: AppVersionConfig;
}

export type NavigationTab =
  | 'dashboard'
  | 'licenses'
  | 'generate'
  | 'devices'
  | 'logs'
  | 'app-version'
  | 'sandbox'
  | 'android-sdk'
  | 'deployment'
  | 'settings'
  | 'profile';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
