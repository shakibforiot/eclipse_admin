import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Terminal,
  FileCode,
  Lock,
  Eye,
  Zap,
  Sparkles,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function AndroidSdkView() {
  const { showToast } = useAuth();
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<
    | 'master_prompt'
    | 'user_details_xml'
    | 'user_details_java'
    | 'user_details_kt'
    | 'manifest'
    | 'retrofit_api'
    | 'gradle'
  >('master_prompt');

  const copyCode = (title: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(title);
    showToast('Copied to Clipboard', `${title} code copied`, 'info');
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const masterPromptText = `You are an expert Android developer integrating the ECLPISE DUMP Auth Kuro License & Security API into an Android App.

API Endpoint: POST /api/v1/auth/login
Base Server URL: http://localhost:3000/ (or production URL)
Protocol: HTTPS REST / JSON

1. REQUIRED REQUEST JSON PAYLOAD:
{
  "license_key": "ECLP-TEST-KEY",
  "device_id": "<android_id>",
  "app_version": "1.0.0",
  "device_model": "<device_manufacturer_and_model>",
  "android_version": "Android 14 (API 34)"
}

2. API RESPONSE FIELD MAPPINGS (Exact 5 TextView IDs):
Server response returns success = true and 5 formatted UI strings:
- version: Set text on TextView @+id/version (Format: "Android Version ⬇\\n┗ " + version)
- user: Set text on TextView @+id/user (Format: "Username ⬇\\n┗ " + user)
- pass: Set text on TextView @+id/pass (Format: "Password ⬇\\n┗ " + pass)
- rgtime: Set text on TextView @+id/rgtime (Format: "Registered ⬇\\n┗ " + rgtime)
- valid: Set text on TextView @+id/valid (Format: "Expiry ⬇\\n┗ " + valid)

3. XML LAYOUT (activity_main.xml):
- Root: LinearLayout (vertical, padding 20dp, background #121212)
- Inner container ID: @+id/view_user_details (background #1E1E1E, padding 16dp)
- TextView IDs: @+id/version, @+id/user, @+id/pass, @+id/rgtime, @+id/valid (all textColor #F00000, textSize 12sp, textStyle bold)

4. MANIFEST PERMISSIONS:
- <uses-permission android:name="android.permission.INTERNET" />
- <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
- android:usesCleartextTraffic="true" inside <application>

Please write complete, production-ready Android Java/Kotlin code and XML layouts implementing this exact API contract.`;

  const copyMasterPrompt = () => {
    navigator.clipboard.writeText(masterPromptText);
    setCopiedPrompt(true);
    showToast('Master AI Prompt Copied!', 'Paste this prompt directly into ChatGPT/Gemini/Claude', 'success');
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const snippets = {
    master_prompt: {
      name: 'Master_AI_Prompt.txt',
      desc: 'One-click prompt to give to any AI model (ChatGPT, Claude, Gemini) to build/integrate the Android app automatically.',
      code: masterPromptText,
    },
    user_details_xml: {
      name: 'activity_main.xml',
      desc: 'Exact XML layout with red bold TextViews (@+id/version, @+id/user, @+id/pass, @+id/rgtime, @+id/valid).',
      code: `<?xml version="1.0" encoding="utf-8"?>
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
            android:text="Android Version ⬇\\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/user"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Username ⬇\\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/pass"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Password ⬇\\n┗ Loading..."
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/rgtime"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Registered ⬇\\n┗ 00/00/0000"
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/valid"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Expiry ⬇\\n┗ 00/00/0000"
            android:textColor="#F00000"
            android:textSize="12sp"
            android:textStyle="bold" />

    </LinearLayout>

</LinearLayout>`,
    },
    user_details_java: {
      name: 'MainActivity.java',
      desc: 'Zero-dependency Java Activity making HTTP REST calls to /api/v1/auth/login and populating all 5 TextViews.',
      code: `package com.example.eclipsedump;

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

    // 1. Change BASE_URL to your server host (use trailing slash):
    private static final String BASE_URL = "http://10.0.2.2:3000/"; // Emulator local
    
    // 2. License key or username to authenticate:
    private static final String LICENSE_KEY = "ECLP-TEST-KEY";

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

        // Bind TextViews by ID
        viewUserDetails = findViewById(R.id.view_user_details);
        tvVersion = findViewById(R.id.version);
        tvUser = findViewById(R.id.user);
        tvPass = findViewById(R.id.pass);
        tvRgtime = findViewById(R.id.rgtime);
        tvValid = findViewById(R.id.valid);

        // Fetch details from API
        fetchUserDetails(LICENSE_KEY);
    }

    private void fetchUserDetails(final String licenseKey) {
        new Thread(() -> {
            try {
                // Collect Device Hardware & System Details
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

                // Build JSON Request Body
                JSONObject requestData = new JSONObject();
                requestData.put("license_key", licenseKey);
                requestData.put("device_id", deviceId != null ? deviceId : "unknown_device");
                requestData.put("device_model", deviceModel);
                requestData.put("android_version", androidVersion);
                requestData.put("app_version", "1.0.0");

                // Send Payload
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = requestData.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int statusCode = conn.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                        statusCode >= 200 && statusCode < 300 ? conn.getInputStream() : conn.getErrorStream(),
                        StandardCharsets.UTF_8
                ));

                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                final JSONObject json = new JSONObject(response.toString());

                // Update UI on main thread
                runOnUiThread(() -> {
                    try {
                        if (json.optBoolean("success", false)) {
                            // Extract exact 5 fields directly from JSON response
                            String versionVal = json.optString("version", androidVersion);
                            String userVal = json.optString("user", "User");
                            String passVal = json.optString("pass", "Pass");
                            String rgtimeVal = json.optString("rgtime", "00/00/0000");
                            String validVal = json.optString("valid", "00/00/0000");

                            // Set formatted text on TextViews
                            tvVersion.setText("Android Version ⬇\\n┗ " + versionVal);
                            tvUser.setText("Username ⬇\\n┗ " + userVal);
                            tvPass.setText("Password ⬇\\n┗ " + passVal);
                            tvRgtime.setText("Registered ⬇\\n┗ " + rgtimeVal);
                            tvValid.setText("Expiry ⬇\\n┗ " + validVal);

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
}`,
    },
    user_details_kt: {
      name: 'MainActivity.kt',
      desc: 'Modern Kotlin Activity using Coroutines and HttpURLConnection.',
      code: `package com.example.eclipsedump

import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

class MainActivity : AppCompatActivity() {

    companion object {
        private const val BASE_URL = "http://10.0.2.2:3000/"
        private const val LICENSE_KEY = "ECLP-TEST-KEY"
    }

    private lateinit var viewUserDetails: LinearLayout
    private lateinit var tvVersion: TextView
    private lateinit var tvUser: TextView
    private lateinit var tvPass: TextView
    private lateinit var tvRgtime: TextView
    private lateinit var tvValid: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        viewUserDetails = findViewById(R.id.view_user_details)
        tvVersion = findViewById(R.id.version)
        tvUser = findViewById(R.id.user)
        tvPass = findViewById(R.id.pass)
        tvRgtime = findViewById(R.id.rgtime)
        tvValid = findViewById(R.id.valid)

        fetchUserDetails(LICENSE_KEY)
    }

    private fun fetchUserDetails(key: String) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
                val deviceModel = "\${Build.MANUFACTURER} \${Build.MODEL}"
                val androidVersion = "Android \${Build.VERSION.RELEASE} (API \${Build.VERSION.SDK_INT})"

                val url = URL(BASE_URL + "api/v1/auth/login")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                    doOutput = true
                    connectTimeout = 10000
                    readTimeout = 10000
                }

                val payload = JSONObject().apply {
                    put("license_key", key)
                    put("device_id", deviceId)
                    put("device_model", deviceModel)
                    put("android_version", androidVersion)
                    put("app_version", "1.0.0")
                }

                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(StandardCharsets.UTF_8))
                }

                val responseCode = conn.responseCode
                val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                val reader = BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8))
                val responseStr = reader.use { it.readText() }

                val json = JSONObject(responseStr)

                withContext(Dispatchers.Main) {
                    if (json.optBoolean("success", false)) {
                        tvVersion.text = "Android Version ⬇\\n┗ " + json.optString("version", androidVersion)
                        tvUser.text = "Username ⬇\\n┗ " + json.optString("user", "User")
                        tvPass.text = "Password ⬇\\n┗ " + json.optString("pass", "Pass")
                        tvRgtime.text = "Registered ⬇\\n┗ " + json.optString("rgtime", "00/00/0000")
                        tvValid.text = "Expiry ⬇\\n┗ " + json.optString("valid", "00/00/0000")

                        viewUserDetails.visibility = View.VISIBLE
                        Toast.makeText(this@MainActivity, "Authentication Successful!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@MainActivity, "Error: " + json.optString("message"), Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MainActivity, "Network Error: \${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}`,
    },
    manifest: {
      name: 'AndroidManifest.xml',
      desc: 'Internet permissions and cleartext HTTP configuration.',
      code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.eclipsedump">

    <!-- Internet & Network State Permissions -->
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
</manifest>`,
    },
    retrofit_api: {
      name: 'EclipseRetrofitApi.java',
      desc: 'Modern Retrofit interface with Gson models for Android app developers.',
      code: `package com.eclipsedump.network;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface EclipseRetrofitApi {

    public static class LoginRequest {
        public String license_key;
        public String device_id;
        public String device_model;
        public String android_version;
        public String app_version;

        public LoginRequest(String key, String deviceId, String model, String osVer, String appVer) {
            this.license_key = key;
            this.device_id = deviceId;
            this.device_model = model;
            this.android_version = osVer;
            this.app_version = appVer;
        }
    }

    public static class LoginResponse {
        public boolean success;
        public String message;
        public String session_token;
        public String version;
        public String user;
        public String pass;
        public String rgtime;
        public String valid;
    }

    @POST("api/v1/auth/login")
    Call<LoginResponse> login(@Body LoginRequest body);
}`,
    },
    gradle: {
      name: 'build.gradle (Module: app)',
      desc: 'Dependencies for Android Studio app build.',
      code: `dependencies {
    // Core Android UI & Appcompat
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    
    // Retrofit & OkHttp (Optional for advanced networking)
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.11.0'
}`,
    },
  };

  const currentSnippet = snippets[activeSnippet];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-red-500" />
            <span>Android Integration & Details View</span>
          </h1>
          <p className="text-sm text-slate-400">
            One-page master suite: Integration code, XML layouts, 5-field JSON mappings, and 1-Click AI Master Prompt.
          </p>
        </div>

        <button
          onClick={copyMasterPrompt}
          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2"
        >
          {copiedPrompt ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{copiedPrompt ? 'Copied Master AI Prompt!' : 'Copy 1-Click Master AI Prompt'}</span>
        </button>
      </div>

      {/* Hero Master AI Prompt Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-black/60 to-purple-950/40 border border-red-500/30 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Master AI Integration Prompt</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded-md">
                  1-Click AI Prompt
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Copy and give this single prompt to any AI model (ChatGPT / Gemini / Claude) to generate the Android application integration in one shot!
              </p>
            </div>
          </div>

          <button
            onClick={copyMasterPrompt}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-all shrink-0 flex items-center gap-1.5"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
          {masterPromptText}
        </div>
      </div>

      {/* 5 Field Mapping Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-black/40 to-black/40 border border-red-500/20 shadow-xl backdrop-blur-md">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-red-500" />
          <span>Live 5-Field Android Layout Mapping (JSON to XML)</span>
        </h3>
        <p className="text-xs text-slate-300 mb-4">
          The server response returns these 5 exact string fields to populate your <code className="text-red-400">#F00000</code> TextViews:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all">
            <span className="text-[10px] uppercase font-mono text-red-400 font-bold block mb-1">1. version</span>
            <p className="text-xs font-mono text-white">Android Version ⬇</p>
            <p className="text-[11px] font-mono text-red-400 font-bold mt-1">┗ Android 14 (API 34)</p>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all">
            <span className="text-[10px] uppercase font-mono text-red-400 font-bold block mb-1">2. user</span>
            <p className="text-xs font-mono text-white">Username ⬇</p>
            <p className="text-[11px] font-mono text-red-400 font-bold mt-1">┗ User_9482</p>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all">
            <span className="text-[10px] uppercase font-mono text-red-400 font-bold block mb-1">3. pass</span>
            <p className="text-xs font-mono text-white">Password ⬇</p>
            <p className="text-[11px] font-mono text-red-400 font-bold mt-1">┗ Pass_7721</p>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all">
            <span className="text-[10px] uppercase font-mono text-red-400 font-bold block mb-1">4. rgtime</span>
            <p className="text-xs font-mono text-white">Registered ⬇</p>
            <p className="text-[11px] font-mono text-red-400 font-bold mt-1">┗ 21/08/2026</p>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-red-500/30 hover:border-red-500/60 transition-all">
            <span className="text-[10px] uppercase font-mono text-red-400 font-bold block mb-1">5. valid</span>
            <p className="text-xs font-mono text-white">Expiry ⬇</p>
            <p className="text-[11px] font-mono text-red-400 font-bold mt-1">┗ 31/12/2026</p>
          </div>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-black/40 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 overflow-x-auto">
          <div className="flex items-center gap-2">
            {[
              { id: 'master_prompt', label: 'Master AI Prompt', icon: Sparkles },
              { id: 'user_details_xml', label: 'activity_main.xml', icon: FileCode },
              { id: 'user_details_java', label: 'MainActivity.java', icon: Smartphone },
              { id: 'user_details_kt', label: 'MainActivity.kt', icon: Code2 },
              { id: 'manifest', label: 'AndroidManifest.xml', icon: Lock },
              { id: 'retrofit_api', label: 'EclipseRetrofitApi.java', icon: Layers },
              { id: 'gradle', label: 'build.gradle', icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSnippet === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSnippet(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600/30 text-red-200 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'bg-black/40 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => copyCode(currentSnippet.name, currentSnippet.code)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all shrink-0 ml-3"
          >
            {copiedFile === currentSnippet.name ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied Code</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* Snippet Description */}
        <div className="px-6 py-3 bg-black/40 border-b border-white/5 text-xs text-slate-400">
          <span className="font-bold text-slate-300">{currentSnippet.name}:</span> {currentSnippet.desc}
        </div>

        {/* Code Content */}
        <div className="p-6 bg-black/60 overflow-x-auto max-h-[600px]">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed selection:bg-red-500 selection:text-white">
            {currentSnippet.code}
          </pre>
        </div>
      </div>
    </div>
  );
}
