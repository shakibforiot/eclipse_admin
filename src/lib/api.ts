import {
  AdminUser,
  DashboardStats,
  LicenseItem,
  DeviceItem,
  ApiLogItem,
  AppVersionConfig,
} from '../types.ts';

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('eclipse_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Admin Authentication
  async login(username: string, password: string): Promise<{ success: boolean; token: string; admin: AdminUser; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async getMe(): Promise<{ success: boolean; admin: AdminUser; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Stats
  async getStats(): Promise<{ success: boolean; stats: DashboardStats; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Licenses
  async getLicenses(params: { search?: string; status?: string; page?: number; limit?: number }): Promise<{
    success: boolean;
    licenses: LicenseItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/admin/licenses?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async generateLicenses(data: {
    prefix?: string;
    count?: number;
    expiration_type?: string;
    expiration_days?: number;
    custom_expiry?: string | null;
    device_limit?: number;
    status?: 'active' | 'inactive';
    notes?: string;
    custom_user?: string;
    custom_password?: string;
  }): Promise<{ success: boolean; message: string; licenses: LicenseItem[]; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/licenses/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async executeLicenseAction(
    id: number,
    action: 'activate' | 'deactivate' | 'ban' | 'unban' | 'reset_devices' | 'extend_expiry',
    extra?: { days?: number; new_expiry?: string }
  ): Promise<{ success: boolean; message: string; license: LicenseItem; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/licenses/${id}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  },

  async deleteLicense(id: number): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/licenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Devices
  async getDevices(): Promise<{ success: boolean; devices: DeviceItem[]; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/devices`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async unbindDevice(id: number): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/devices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // API Logs
  async getLogs(params: { search?: string; status?: string; limit?: number }): Promise<{
    success: boolean;
    logs: ApiLogItem[];
  }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/admin/logs?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async clearLogs(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // App Versions
  async getAppVersionConfig(): Promise<{ success: boolean; config: AppVersionConfig }> {
    const res = await fetch(`${API_BASE}/admin/app-version`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateAppVersionConfig(data: Partial<AppVersionConfig>): Promise<{ success: boolean; config: AppVersionConfig }> {
    const res = await fetch(`${API_BASE}/admin/app-version`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Profile
  async updateProfile(data: {
    username?: string;
    current_password?: string;
    new_password?: string;
    email?: string;
  }): Promise<{ success: boolean; admin: AdminUser; message: string; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Sandbox / Android Client Test Endpoints (Direct REST call simulation)
  async testAndroidLogin(payload: {
    license_key: string;
    device_id: string;
    app_version: string;
    device_model?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },

  async testAndroidValidate(payload: { session_token: string; device_id: string }) {
    const res = await fetch(`${API_BASE}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },

  async testAndroidLogout(payload: { session_token: string }) {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },

  async testAppVersion() {
    const res = await fetch(`${API_BASE}/app/version`);
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },
};
