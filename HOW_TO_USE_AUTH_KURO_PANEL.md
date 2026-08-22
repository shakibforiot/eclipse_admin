# 🛡️ ECLPISE DUMP - Master Guide & Prompt for Auth Kuro Panel

> **API & Panel Version:** 1.0.0  
> **Protocol:** HTTPS REST / JSON  
> **Default Admin Username:** `admin`  
> **Default Admin Password:** `admin!`  

---

## 📌 Executive Overview

**Auth Kuro Panel (ECLPISE DUMP)** is an enterprise-grade Licensing, Device HWID Binding, and Security Management System tailored for Android applications and software protection.

### Key Capabilities:
- 🔐 **Dual Auth Support:** Accepts single License Keys (`ECLP-XXXX-YYYY`) or Username + Password pairs (`user` / `pass`).
- 📱 **Android UI Auto-Formatting:** Automatically formats API responses to directly populate Android TextViews: `version`, `user`, `pass`, `rgtime`, `valid`.
- 🔒 **Device HWID Lock:** Limits licenses to maximum allowed active devices with SHA-256 device binding.
- ⚡ **Short-Lived Session Tokens:** Cryptographically generated bearer tokens for secure background request validation.
- 🚀 **App Version Enforcer:** Force client app updates when version drops below minimum required threshold.
- 📊 **Security Audit Logs:** Real-time logging of all authentication attempts, response times, IP addresses, and failure codes.
- 🛠️ **Interactive Sandbox & Android SDK:** Embedded UI tools for instant cURL, REST, and Android Java/XML integration testing.

---

## 🚀 Quick Start Guide

### 1. Installation & Environment Setup
```bash
# Clone or open project directory
cd eclpise-dump-license-api

# Install dependencies
npm install

# Run in Development mode (Server + Vite UI)
npm run dev
```

The Web Admin Panel will be accessible at: `http://localhost:3000`

### 2. Administrator Sign-in
- **URL:** `http://localhost:3000`
- **Username:** `admin`
- **Password:** `admin!` *(Configurable via `.env` or Settings tab)*

---

## 📡 Complete REST API Documentation

### 1️⃣ License Authentication (`POST /api/v1/auth/login`)
Authenticates the user/license, checks status, binds device HWID, and returns direct fields for Android UI.

**Request Header:** `Content-Type: application/json`

**Option A — License Key Payload:**
```json
{
  "license_key": "ECLP-TEST-KEY",
  "device_id": "8f3b20c9e12048aa",
  "app_version": "1.0.0",
  "device_model": "Samsung Galaxy S23",
  "android_version": "Android 14 (API 34)"
}
```

**Option B — User & Pass Payload:**
```json
{
  "user": "User_9482",
  "pass": "Pass_7721",
  "device_id": "8f3b20c9e12048aa",
  "app_version": "1.0.0",
  "device_model": "Xiaomi Redmi Note 12",
  "android_version": "Android 13"
}
```

**Successful Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "session_token": "eb8f921a4c...",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "version": "Android 14 (Samsung Galaxy S23)",
  "user": "User_9482",
  "pass": "Pass_7721",
  "rgtime": "21/08/2026",
  "valid": "Lifetime",
  "license_info": {
    "key": "ECLP-TEST-KEY",
    "user": "User_9482",
    "pass": "Pass_7721",
    "status": "active",
    "rgtime": "21/08/2026",
    "valid": "Lifetime",
    "device_limit": 3,
    "devices_used": 1
  }
}
```

---

### 2️⃣ Query User Details (`POST` or `GET /api/v1/auth/user-details`)
Direct lookup endpoint for fetching formatted user info.

**Query Parameter:** `GET /api/v1/auth/user-details?license_key=ECLP-TEST-KEY`

**JSON Response:**
```json
{
  "success": true,
  "version": "Android 14 (API 34)",
  "user": "User_9482",
  "pass": "Pass_7721",
  "rgtime": "21/08/2026",
  "valid": "Lifetime",
  "status": "active",
  "license_key": "ECLP-TEST-KEY"
}
```

---

### 3️⃣ Session Validation (`POST /api/v1/auth/validate`)
Validates that an active `session_token` has not expired or been revoked.

**Request Header:** `Authorization: Bearer <session_token>`  
**Request Body:**
```json
{
  "session_token": "eb8f921a4c...",
  "device_id": "8f3b20c9e12048aa"
}
```

**JSON Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "Session is valid",
  "version": "Android 14 (API 34)",
  "user": "User_9482",
  "pass": "Pass_7721",
  "rgtime": "21/08/2026",
  "valid_until": "Lifetime"
}
```

---

### 4️⃣ Logout Session (`POST /api/v1/auth/logout`)
Invalidates the session token.

**Request Body:**
```json
{
  "session_token": "eb8f921a4c..."
}
```

---

## 📱 Android Studio Integration (XML & Java)

### Step 1: XML Layout (`activity_main.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="20dp"
    android:background="#121212">

    <LinearLayout
        android:id="@+id/view_user_details"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:background="#1E1E1E"
        android:padding="16dp">

        <TextView
            android:id="@+id/version"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Android Version ⬇\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/user"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Username ⬇\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/pass"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Password ⬇\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/rgtime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Registered ⬇\n┗ 00/00/0000"
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/valid"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Expiry ⬇\n┗ 00/00/0000"
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

    </LinearLayout>
</LinearLayout>
```

### Step 2: Java Activity (`MainActivity.java`)
```java
package com.example.eclipsedump;

import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private static final String BASE_URL = "http://10.0.2.2:3000/"; // Emulator local URL
    private static final String LICENSE_KEY = "ECLP-TEST-KEY";

    private TextView tvVersion, tvUser, tvPass, tvRgtime, tvValid;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        tvVersion = findViewById(R.id.version);
        tvUser = findViewById(R.id.user);
        tvPass = findViewById(R.id.pass);
        tvRgtime = findViewById(R.id.rgtime);
        tvValid = findViewById(R.id.valid);

        authenticateLicense(LICENSE_KEY);
    }

    private void authenticateLicense(final String key) {
        new Thread(() -> {
            try {
                String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
                String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;
                String androidVersion = "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")";

                URL url = new URL(BASE_URL + "api/v1/auth/login");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("license_key", key);
                body.put("device_id", deviceId != null ? deviceId : "unknown_device");
                body.put("device_model", deviceModel);
                body.put("android_version", androidVersion);
                body.put("app_version", "1.0.0");

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int responseCode = conn.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                        responseCode >= 200 && responseCode < 300 ? conn.getInputStream() : conn.getErrorStream(),
                        StandardCharsets.UTF_8
                ));

                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONObject res = new JSONObject(sb.toString());

                runOnUiThread(() -> {
                    if (res.optBoolean("success", false)) {
                        tvVersion.setText("Android Version ⬇\n┗ " + res.optString("version"));
                        tvUser.setText("Username ⬇\n┗ " + res.optString("user"));
                        tvPass.setText("Password ⬇\n┗ " + res.optString("pass"));
                        tvRgtime.setText("Registered ⬇\n┗ " + res.optString("rgtime"));
                        tvValid.setText("Expiry ⬇\n┗ " + res.optString("valid"));
                        Toast.makeText(MainActivity.this, "Authentication Successful!", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(MainActivity.this, "Error: " + res.optString("message"), Toast.LENGTH_LONG).show();
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

---

## 🤖 Master AI System Prompt (Copy-Paste for AI Assistant)

When instructing an AI coding assistant or team member to work with or integrate the Auth Kuro Panel, use the prompt below:

```text
You are an expert system engineer integrating the ECLPISE DUMP Auth Kuro License & Security API.

API Server Base URL: http://localhost:3000/ (or production URL)
Protocol: HTTPS REST / JSON

Key Specifications:
1. Authentication Endpoints:
   - POST /api/v1/auth/login (Accepts 'license_key' OR 'user' + 'pass', along with 'device_id', 'app_version', 'device_model', 'android_version')
   - POST /api/v1/auth/validate (Accepts 'session_token' & 'device_id')
   - GET / POST /api/v1/auth/user-details (Query formatted license status)
   - POST /api/v1/auth/logout (Revoke session)

2. Response Schema:
   All auth responses return the 5 mandatory formatted Android UI string fields:
   - "version": Device/Android version (e.g. "Android 14 (API 34)")
   - "user": Assigned Username or Key Display
   - "pass": Secret password or plain key
   - "rgtime": Registration Date formatted as DD/MM/YYYY
   - "valid": Expiry Date formatted as DD/MM/YYYY or "Lifetime"

3. Security & HWID Lock:
   - Automatically computes SHA-256 device binding.
   - Enforces device limit (HTTP 403 DEVICE_LIMIT if exceeded).
   - Rejects banned (HTTP 403 BANNED), inactive (HTTP 403 INACTIVE), or expired keys (HTTP 403 EXPIRED).
   - Checks minimum app version requirement (HTTP 426 UPDATE_REQUIRED).

4. Admin Control Panel:
   - Admin Login: POST /api/v1/admin/login
   - Manage Keys, HWID Devices, Security Audit Logs, and App Versions.

Please follow these exact parameter names and JSON keys when writing code or debugging integrations.
```
