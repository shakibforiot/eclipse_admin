# 📱 ECLPISE DUMP - Android License & User Details API Integration Guide
> **API Version:** 1.0.0 | **Protocol:** HTTPS REST / JSON  
> **Server Base URL (Development):** `https://ais-dev-xup46trgkpb77arxvvw2fm-839417499313.asia-east1.run.app/`  
> **Server Base URL (Production):** `https://<your-render-app>.onrender.com/`

---

## 🎯 ১. API Response Format (আপনার XML Layout এর সাথে মিলিয়ে)

যখন আপনি API তে কল করবেন, সার্ভার সরাসরি নিচের **৫টি ফিল্ড** রিটার্ন করবে:

| API Key | XML TextView ID | অর্থ (Description) | উদাহরণ মান (Example Value) |
|---|---|---|---|
| `version` | `@+id/version` | Android Version / Device OS | `Android 14 (API 34)` |
| `user` | `@+id/user` | Username / License Key | `User_9482` অথবা `ECLP-ABCD-1234` |
| `pass` | `@+id/pass` | Password / Key Secret | `Pass_7721` |
| `rgtime` | `@+id/rgtime` | Registered Date (DD/MM/YYYY) | `21/08/2026` |
| `valid` | `@+id/valid` | Expiry Date (DD/MM/YYYY) | `31/12/2026` অথবা `Lifetime` |

---

## 🚀 ২. API Endpoints (এন্ডপয়েন্ট তালিকা)

### এন্ডপয়েন্ট ১: লাইসেন্স লগইন ও ভেরিফিকেশন
- **URL:** `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body (Option A - License Key):**
```json
{
  "license_key": "ECLP-8X92-KL41-MN99",
  "device_id": "8f3b20c9e12048aa",
  "app_version": "1.0.0",
  "device_model": "Samsung Galaxy S23",
  "android_version": "Android 14 (API 34)"
}
```
- **Request Body (Option B - User & Pass):**
```json
{
  "user": "my_username",
  "pass": "my_password",
  "device_id": "8f3b20c9e12048aa",
  "app_version": "1.0.0",
  "device_model": "Xiaomi Redmi Note 12",
  "android_version": "Android 13"
}
```

- **JSON Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "session_token": "a8f9c102e7b...",
  "version": "Android 14 (Samsung Galaxy S23)",
  "user": "ECLP-8X92-KL41-MN99",
  "pass": "ECLP-8X92-KL41-MN99",
  "rgtime": "21/08/2026",
  "valid": "31/12/2026",
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

---

### এন্ডপয়েন্ট ২: সরাসরি ইউজার ডিটেইলস নেওয়া (User Details)
- **URL:** `GET /api/v1/auth/user-details?license_key=ECLP-8X92-KL41-MN99`
- **অথবা POST:** `/api/v1/auth/user-details`
- **Request Body:**
```json
{
  "license_key": "ECLP-8X92-KL41-MN99"
}
```
- **সরাসরি Response:**
```json
{
  "success": true,
  "version": "Android 14 (API 34)",
  "user": "User_9482",
  "pass": "Pass_7721",
  "rgtime": "21/08/2026",
  "valid": "31/12/2026",
  "status": "active"
}
```

---

## 🎨 ৩. Android Layout XML (`activity_main.xml`)

আপনার দেওয়া XML লেআউট:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="20dp"
    android:background="#121212">

    <!-- View 2: User & Device Details -->
    <LinearLayout
        android:id="@+id/view_user_details"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:background="#1E1E1E"
        android:padding="16dp"
        android:visibility="visible">

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

---

## 💻 ৪. Android Java কোড (`MainActivity.java`)

কোনো অতিরিক্ত লাইব্রেরি ছাড়া সাধারণ Android Java কোড:

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

    // 1. আপনার API Base URL দিন (শেষে স্ল্যাশ সহ):
    private static final String BASE_URL = "https://ais-dev-xup46trgkpb77arxvvw2fm-839417499313.asia-east1.run.app/";
    
    // 2. যে লাইসেন্স কী টেস্ট করবেন:
    private static final String LICENSE_KEY = "ECLP-XXXX-YYYY-ZZZZ";

    private LinearLayout viewUserDetails;
    private TextView tvVersion;
    private TextView tvUser;
    private TextView tvPass;
    private TextView tvRgtime;
    private TextView tvValid;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // ভিউ ইনিশিয়ালাইজ করুন
        viewUserDetails = findViewById(R.id.view_user_details);
        tvVersion = findViewById(R.id.version);
        tvUser = findViewById(R.id.user);
        tvPass = findViewById(R.id.pass);
        tvRgtime = findViewById(R.id.rgtime);
        tvValid = findViewById(R.id.valid);

        // API কল করে ডেটা লোড করুন
        fetchUserDetails(LICENSE_KEY);
    }

    private void fetchUserDetails(final String licenseKey) {
        new Thread(() -> {
            try {
                // ডিভাইস তথ্য সংগ্রহ
                String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
                String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;
                String androidVersion = "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")";

                URL url = new URL(BASE_URL + "api/v1/auth/login");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setDoOutput(true);

                // JSON রিকোয়েস্ট বডি তৈরি
                JSONObject requestData = new JSONObject();
                requestData.put("license_key", licenseKey);
                requestData.put("device_id", deviceId);
                requestData.put("device_model", deviceModel);
                requestData.put("android_version", androidVersion);
                requestData.put("app_version", "1.0.0");

                // ডেটা পাঠান
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = requestData.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                BufferedReader reader;
                if (responseCode >= 200 && responseCode < 300) {
                    reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                } else {
                    reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8));
                }

                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                final JSONObject json = new JSONObject(response.toString());

                // UI থ্রেডে TextView আপডেট করুন
                runOnUiThread(() -> {
                    try {
                        if (json.optBoolean("success", false)) {
                            // API থেকে পাওয়া মানগুলো সরাসরি সেট করা
                            String versionVal = json.optString("version", androidVersion);
                            String userVal = json.optString("user", "User");
                            String passVal = json.optString("pass", "Pass");
                            String rgtimeVal = json.optString("rgtime", "00/00/0000");
                            String validVal = json.optString("valid", "00/00/0000");

                            tvVersion.setText("Android Version ⬇\n┗ " + versionVal);
                            tvUser.setText("Username ⬇\n┗ " + userVal);
                            tvPass.setText("Password ⬇\n┗ " + passVal);
                            tvRgtime.setText("Registered ⬇\n┗ " + rgtimeVal);
                            tvValid.setText("Expiry ⬇\n┗ " + validVal);

                            viewUserDetails.setVisibility(View.VISIBLE);
                            Toast.makeText(MainActivity.this, "Authentication Successful!", Toast.LENGTH_SHORT).show();
                        } else {
                            String message = json.optString("message", "Authentication Failed");
                            Toast.makeText(MainActivity.this, "Error: " + message, Toast.LENGTH_LONG).show();
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Network Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}
```

---

## ⚡ ৫. Android Manifest পারমিশন (`AndroidManifest.xml`)

`AndroidManifest.xml` ফাইলে ইন্টারনেট পারমিশন নিশ্চিত করুন:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.eclipsedump">

    <!-- ইন্টারনেট ব্যবহারের অনুমতি -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>
</manifest>
```

---

## 🧪 ৬. cURL দিয়ে সাথে সাথে টেস্ট করুন

টার্মিনাল বা Postman এ এই কমান্ড দিয়ে টেস্ট করতে পারেন:

```bash
curl -X POST "https://ais-dev-xup46trgkpb77arxvvw2fm-839417499313.asia-east1.run.app/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "ECLP-TEST-KEY",
    "device_id": "test_device_123",
    "device_model": "Pixel 7 Pro",
    "android_version": "Android 14 (API 34)",
    "app_version": "1.0.0"
  }'
```

**আউটপুট:**
```json
{
  "success": true,
  "version": "Android 14 (API 34) (Pixel 7 Pro)",
  "user": "ECLP-TEST-KEY",
  "pass": "ECLP-TEST-KEY",
  "rgtime": "21/08/2026",
  "valid": "Lifetime",
  "session_token": "..."
}
```
