import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/views/LoginView.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { LicensesView } from './components/views/LicensesView.tsx';
import { GenerateKeyView } from './components/views/GenerateKeyView.tsx';
import { DevicesView } from './components/views/DevicesView.tsx';
import { ApiLogsView } from './components/views/ApiLogsView.tsx';
import { AppVersionView } from './components/views/AppVersionView.tsx';
import { ApiSandboxView } from './components/views/ApiSandboxView.tsx';
import { AndroidSdkView } from './components/views/AndroidSdkView.tsx';
import { DeploymentGuideView } from './components/views/DeploymentGuideView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { AdminProfileView } from './components/views/AdminProfileView.tsx';
import { ToastContainer } from './components/common/Toast.tsx';

function MainLayout() {
  const { isAuthenticated, isLoading, activeTab } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-slate-200 relative overflow-hidden font-sans"
        style={{
          backgroundColor: '#020205',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #0a0b1e 0%, #020205 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse">
            <span className="font-black text-white text-sm tracking-wider">ED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <p className="text-xs font-mono text-indigo-300 tracking-widest uppercase">
              Initializing ECLIPSE DUMP Core...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div
      className="min-h-screen text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-x-hidden"
      style={{
        backgroundColor: '#020205',
        backgroundImage: 'radial-gradient(circle at 50% 40%, #0a0b1e 0%, #020205 100%)',
      }}
    >
      {/* Cyber grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-15 z-0"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glowing dots in top-right */}
      <div className="fixed top-0 right-0 p-8 flex gap-2 pointer-events-none z-50">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500/40"></div>
      </div>

      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'licenses' && <LicensesView />}
          {activeTab === 'generate' && <GenerateKeyView />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'logs' && <ApiLogsView />}
          {activeTab === 'app-version' && <AppVersionView />}
          {activeTab === 'sandbox' && <ApiSandboxView />}
          {activeTab === 'android-sdk' && <AndroidSdkView />}
          {activeTab === 'deployment' && <DeploymentGuideView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'profile' && <AdminProfileView />}
        </main>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
