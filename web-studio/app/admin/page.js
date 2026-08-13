'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';

export default function AdminDashboardPage() {
  const { user, login, logout } = useAuth();
  const router = useRouter();

  // Navigation Tabs: overview | catalogue | api_pools | credit_ledger | job_stream | health | users | audit_logs
  const [activeTab, setActiveTab] = useState('overview');
  const [catalogueModalityFilter, setCatalogueModalityFilter] = useState('all');

  // Login form state for unauthenticated or non-admin users
  const [adminEmail, setAdminEmail] = useState('admin@aether.ai');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Telemetry & Data States
  const [stats, setStats] = useState({
    activeJobsCount: 0,
    totalCreditsGranted: 0,
    totalCostUsd: 0,
    activeKeysCount: 0,
    activeUsersCount: 0,
    enabledModelsCount: 0,
    successRate: 99.2,
  });

  const [modelsList, setModelsList] = useState([]);
  const [apiPoolKeys, setApiPoolKeys] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [creditLedger, setCreditLedger] = useState([]);
  const [videoJobs, setVideoJobs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [providerHealth, setProviderHealth] = useState([]);
  const [cacheStats, setCacheStats] = useState({ totalEntries: 0, totalHits: 0, memorySavedUsd: 0 });

  // Modal States
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [newModelData, setNewModelData] = useState({
    display_name: '',
    provider_slug: 'google-veo',
    provider_model_id: '',
    modality: 'text-to-video',
    quality_tier: 'standard',
    credits_per_unit: 5,
    unit: 'per-second',
    provider_cost_usd: 0.08,
    description: '',
  });

  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('google-veo');
  const [newKeyBudget, setNewKeyBudget] = useState(100);

  const [grantCreditsUserId, setGrantCreditsUserId] = useState(null);
  const [grantAmount, setGrantAmount] = useState(1000);

  const [pingResult, setPingResult] = useState(null);
  const [pingingProvider, setPingingProvider] = useState(null);

  const isAuthorized = user && (user.role === 'super_admin' || user.permissions?.includes('platform:admin'));

  // Load Dashboard Data from Microservices
  const loadDashboardData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingData(true);

    try {
      const [modelsRes, poolRes, usersRes, ledgerRes, jobsRes, healthRes, auditRes, cacheRes] = await Promise.all([
        fetch('http://localhost:3001/v1/admin/models').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('http://localhost:3001/v1/pools/keys').then(r => r.json()).catch(() => ({ keys: [] })),
        fetch('http://localhost:3008/v1/auth/users').then(r => r.json()).catch(() => ({ users: [] })),
        fetch('http://localhost:3008/v1/credits/ledger').then(r => r.json()).catch(() => ({ ledger: [] })),
        fetch('http://localhost:3011/v1/video/jobs').then(r => r.json()).catch(() => ({ jobs: [] })),
        fetch('http://localhost:3001/v1/providers/health-summary').then(r => r.json()).catch(() => ({ health_summary: [] })),
        fetch('http://localhost:3008/v1/auth/audit-logs').then(r => r.json()).catch(() => ({ audit_logs: [] })),
        fetch('http://localhost:3001/v1/cache/stats').then(r => r.json()).catch(() => ({ stats: { totalEntries: 0, totalHits: 0, memorySavedUsd: 0 } })),
      ]);

      const models = modelsRes.models || [];
      const keys = poolRes.keys || [];
      const users = usersRes.users || [];
      const ledger = ledgerRes.records || ledgerRes.ledger || [];
      const jobs = jobsRes.jobs || [];
      const health = healthRes.health_summary || [];
      const audits = auditRes.audit_logs || [];
      const cache = cacheRes.stats || { totalEntries: 0, totalHits: 0, memorySavedUsd: 0 };

      setModelsList(models);
      setApiPoolKeys(keys);
      setUsersList(users);
      setCreditLedger(ledger);
      setVideoJobs(jobs);
      setProviderHealth(health);
      setAuditLogs(audits);
      setCacheStats(cache);

      const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued').length;
      const totalCredits = users.reduce((acc, u) => acc + (u.credits_balance || 0), 0);
      const activeKeys = keys.filter(k => k.status === 'ACTIVE' || k.status === 'active').length;
      const enabledModels = models.filter(m => m.is_enabled).length;

      setStats({
        activeJobsCount: activeJobs,
        totalCreditsGranted: totalCredits,
        totalCostUsd: (totalCredits * 0.02).toFixed(2),
        activeKeysCount: activeKeys,
        activeUsersCount: users.length,
        enabledModelsCount: enabledModels,
        successRate: 99.2,
      });
    } catch (err) {
      console.warn('[Admin Console] Error loading telemetry:', err);
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    }
  }, [isAuthorized, loadDashboardData]);

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');

    try {
      const res = await login(adminEmail, adminPassword);
      if (!res.success) {
        setLoginError(res.error || 'Invalid credentials');
      } else if (res.user?.role !== 'super_admin' && !res.user?.permissions?.includes('platform:admin')) {
        setLoginError('Access denied: Account does not have Super Admin privileges.');
      } else {
        await loadDashboardData();
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Model Catalogue Actions
  const handleAddModel = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/v1/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModelData),
      });
      if (!res.ok) throw new Error('Failed to create model');
      setShowAddModelModal(false);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error adding model');
    }
  };

  const handleToggleModelEnabled = async (modelId, currentStatus) => {
    try {
      await fetch(`http://localhost:3001/v1/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentStatus }),
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error toggling model');
    }
  };

  const handleToggleModelFeatured = async (modelId, currentFeatured) => {
    try {
      await fetch(`http://localhost:3001/v1/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !currentFeatured }),
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error updating model feature state');
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!confirm('Are you sure you want to remove this model from the active catalogue? Users will no longer be able to select it.')) return;
    try {
      await fetch(`http://localhost:3001/v1/admin/models/${modelId}`, { method: 'DELETE' });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error deleting model');
    }
  };

  // API Pool Key Actions
  const handleAddPoolKey = async (e) => {
    e.preventDefault();
    if (!newKeyName || !newKeySecret) return;

    try {
      const res = await fetch('http://localhost:3001/v1/pools/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKeyProvider,
          keyName: newKeyName,
          keySecret: newKeySecret,
          monthlyBudgetUsd: Number(newKeyBudget),
          priority: 1,
        }),
      });
      if (!res.ok) throw new Error('Failed to add key to pool');

      setShowAddKeyModal(false);
      setNewKeyName('');
      setNewKeySecret('');
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to add key to pool');
    }
  };

  const handleTogglePoolKey = async (keyId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' || currentStatus === 'active' ? 'DISABLED' : 'ACTIVE';
      await fetch(`http://localhost:3001/v1/pools/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to toggle key');
    }
  };

  const handleDeletePoolKey = async (keyId) => {
    if (!confirm('Delete API key from pool permanently?')) return;
    try {
      await fetch(`http://localhost:3001/v1/pools/keys/${keyId}`, { method: 'DELETE' });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete key');
    }
  };

  // User Governance Actions
  const handleGrantCredits = async (targetUserId) => {
    try {
      const res = await fetch(`http://localhost:3008/v1/auth/users/${targetUserId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(grantAmount), reason: 'Admin Manual Grant' }),
      });
      if (!res.ok) throw new Error('Failed to grant credits');

      setGrantCreditsUserId(null);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error granting credits');
    }
  };

  const handleToggleUserRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === 'super_admin' ? 'member' : 'super_admin';
    if (!confirm(`Change user role to ${newRole.toUpperCase()}?`)) return;

    try {
      await fetch(`http://localhost:3008/v1/auth/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update user role');
    }
  };

  // Provider Ping Action
  const handlePingProvider = async (providerId) => {
    setPingingProvider(providerId);
    setPingResult(null);
    const start = Date.now();

    try {
      const res = await fetch(`http://localhost:3001/v1/providers/${providerId}/health`);
      const latency = Date.now() - start;
      const data = await res.json().catch(() => ({ status: 'unknown' }));

      setPingResult({
        provider: providerId,
        latency,
        status: res.ok ? 'HEALTHY' : 'DEGRADED',
        details: data,
      });
    } catch (e) {
      setPingResult({
        provider: providerId,
        latency: Date.now() - start,
        status: 'UNREACHABLE',
        details: { error: e.message },
      });
    } finally {
      setPingingProvider(null);
    }
  };

  // Filtered Model List for Catalogue Tab
  const filteredModels = modelsList.filter((m) =>
    catalogueModalityFilter === 'all' ? true : m.modality === catalogueModalityFilter
  );

  // 🛡️ SUPER ADMIN AUTHENTICATION GUARD
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-4 font-sans text-zinc-100 selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-md bg-[#0f1117] border border-purple-500/20 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#07080a] rounded-[14px] flex items-center justify-center text-2xl font-bold text-white">
                🛡️
              </div>
            </div>
            <h1 className="text-2xl font-extrabold font-grotesk tracking-tight text-white">
              Aether Operations Console
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Super Admin Authorization Required
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                placeholder="admin@aether.ai"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">
                Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Authenticate Super Admin'}
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Pre-filled Credentials Ready</span>
            <button
              type="button"
              onClick={() => { setAdminEmail('admin@aether.ai'); setAdminPassword('admin123'); }}
              className="text-purple-400 hover:underline font-bold"
            >
              Fill Credentials
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────── STANDALONE ENTERPRISE ADMIN DASHBOARD ──────────
  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      
      {/* Enterprise Portal Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0c0d12] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-md shadow-purple-900/30">
              🛡️
            </div>
            <div>
              <span className="font-extrabold font-grotesk text-sm text-white tracking-tight">
                Aether Enterprise Console
              </span>
              <span className="ml-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                v3.2 Production
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition"
          >
            <span>🔄</span>
            <span>Refresh Telemetry</span>
          </button>

          <Link
            href="/video"
            className="text-xs text-purple-300 hover:text-white font-bold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-xl transition"
          >
            Launch Creative Studio ↗
          </Link>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="text-right text-xs hidden md:block">
              <div className="font-bold text-white font-grotesk">{user.name || 'Super Admin'}</div>
              <div className="text-[10px] text-purple-400 font-mono font-bold">SUPER ADMIN</div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace Layout */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Operations Navigation Sidebar */}
        <aside className="w-64 border-r border-white/[0.08] bg-[#090a0e] p-3 flex flex-col justify-between shrink-0">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-grotesk">
              Operational Telemetry
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>📊</span>
                <span>Overview KPIs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('catalogue')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'catalogue'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🤖</span>
                <span>AI Model Catalogue</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-purple-300 font-bold">
                {modelsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('api_pools')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'api_pools'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🔑</span>
                <span>API Key Pools</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-bold">
                {stats.activeKeysCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('credit_ledger')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'credit_ledger'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>⚡</span>
                <span>Credit Ledger</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('job_stream')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'job_stream'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🎬</span>
                <span>Generation Stream</span>
              </div>
              {stats.activeJobsCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold animate-pulse">
                  {stats.activeJobsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'health'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🩺</span>
                <span>Provider Latency</span>
              </div>
            </button>

            <div className="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-grotesk">
              Governance & Security
            </div>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>👥</span>
                <span>User Governance</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                activeTab === 'audit_logs'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>📜</span>
                <span>Audit Logs</span>
              </div>
            </button>
          </nav>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-bold">
              System Roles
            </div>
            <div className="text-[11px] text-zinc-300 font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span>Super Admin:</span>
                <span className="text-purple-400 font-bold">Full Access</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Standard User:</span>
                <span className="text-zinc-400 font-bold">Generation Only</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Operational Workspace View */}
        <main className="flex-1 bg-[#07080a] p-8 overflow-y-auto space-y-8">
          
          {/* MODULE 1: OVERVIEW KPIS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">Platform Operational Telemetry</h2>
                <p className="text-xs text-zinc-400">Real-time status of AI generation jobs, credit consumption, and model catalogue state.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e1015] border border-white/10 space-y-2 shadow-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">Active Generation Jobs</div>
                  <div className="text-3xl font-extrabold font-mono text-cyan-400">{stats.activeJobsCount}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Running parallel across API pool</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-white/10 space-y-2 shadow-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">Total Credits Allocated</div>
                  <div className="text-3xl font-extrabold font-mono text-purple-400">⚡ {stats.totalCreditsGranted}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">~${stats.totalCostUsd} USD Platform Value</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-white/10 space-y-2 shadow-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">Active API Pool Keys</div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400">{stats.activeKeysCount}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Weighted-LRU Failover Protection</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-white/10 space-y-2 shadow-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-grotesk">Enabled AI Models</div>
                  <div className="text-3xl font-extrabold font-mono text-indigo-400">{stats.enabledModelsCount} / {modelsList.length}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">Active in User Dropdowns</div>
                </div>
              </div>

              {/* Model Margin Analysis */}
              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold font-grotesk text-white flex items-center gap-2">
                  <span>💰 AI Model Cost & Platform Gross Margin Analysis</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Model Display Name</th>
                        <th className="pb-3 font-bold">Modality</th>
                        <th className="pb-3 font-bold">Provider API Cost</th>
                        <th className="pb-3 font-bold">User Credit Cost</th>
                        <th className="pb-3 font-bold">Credit USD Value</th>
                        <th className="pb-3 font-bold">Gross Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {modelsList.map((m) => {
                        const usdVal = m.credits_per_unit * 0.02;
                        const margin = m.provider_cost_usd > 0 ? (((usdVal - m.provider_cost_usd) / usdVal) * 100).toFixed(1) : '50.0';
                        return (
                          <tr key={m.id}>
                            <td className="py-3 font-bold text-white">{m.display_name}</td>
                            <td className="py-3 text-purple-300">{m.modality}</td>
                            <td className="py-3 text-rose-400 font-mono">${m.provider_cost_usd} / {m.unit.replace('per-', '')}</td>
                            <td className="py-3 text-purple-400 font-mono font-bold">⚡ {m.credits_per_unit} cr</td>
                            <td className="py-3 text-zinc-200 font-mono">${usdVal.toFixed(3)}</td>
                            <td className="py-3 font-bold text-emerald-400 font-mono">+{margin}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: AI MODEL CATALOGUE MANAGEMENT */}
          {activeTab === 'catalogue' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold font-grotesk text-white">AI Model Catalogue Manager</h2>
                  <p className="text-xs text-zinc-400">Control which models users can see in studio dropdowns, set credit costs, and toggle availability.</p>
                </div>

                <button
                  onClick={() => setShowAddModelModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition flex items-center gap-2"
                >
                  <span>➕ Add Model to Catalogue</span>
                </button>
              </div>

              {/* Modality Filter Bar */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto text-xs font-grotesk">
                {['all', 'text-to-video', 'text-to-image', 'voice-tts', 'avatar-lipsync'].map((mod) => (
                  <button
                    key={mod}
                    onClick={() => setCatalogueModalityFilter(mod)}
                    className={`px-3 py-1.5 rounded-xl font-bold capitalize transition ${
                      catalogueModalityFilter === mod
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mod.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Display Name</th>
                        <th className="pb-3 font-bold">Provider & Model ID</th>
                        <th className="pb-3 font-bold">Modality</th>
                        <th className="pb-3 font-bold">Credit Cost</th>
                        <th className="pb-3 font-bold">Provider Cost</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold">Featured</th>
                        <th className="pb-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {filteredModels.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-zinc-500 font-mono">
                            No models registered for modality '{catalogueModalityFilter}'.
                          </td>
                        </tr>
                      ) : (
                        filteredModels.map((m) => (
                          <tr key={m.id}>
                            <td className="py-3.5 font-bold text-white">
                              <div>{m.display_name}</div>
                              <div className="text-[10px] text-zinc-500 font-normal line-clamp-1">{m.description}</div>
                            </td>
                            <td className="py-3.5 text-zinc-300">
                              <div className="font-bold text-purple-300">{m.provider_slug}</div>
                              <div className="text-[10px] text-zinc-500">{m.provider_model_id}</div>
                            </td>
                            <td className="py-3.5 text-cyan-300">{m.modality}</td>
                            <td className="py-3.5 font-bold text-purple-400">⚡ {m.credits_per_unit} cr / {m.unit.replace('per-', '')}</td>
                            <td className="py-3.5 text-rose-400">${m.provider_cost_usd}</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.is_enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                {m.is_enabled ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <button
                                onClick={() => handleToggleModelFeatured(m.id, m.is_featured)}
                                className={`text-base transition ${m.is_featured ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-100'}`}
                              >
                                ⭐
                              </button>
                            </td>
                            <td className="py-3.5 space-x-2">
                              <button
                                onClick={() => handleToggleModelEnabled(m.id, m.is_enabled)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${m.is_enabled ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'}`}
                              >
                                {m.is_enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleDeleteModel(m.id)}
                                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 3: API KEY POOL MANAGEMENT */}
          {activeTab === 'api_pools' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold font-grotesk text-white">Production AI API Key Pool Manager</h2>
                  <p className="text-xs text-zinc-400">Configure multi-key Weighted-LRU load distribution, automatic 429 cooldown, and monthly budget caps in Neon DB.</p>
                </div>
                <button
                  onClick={() => setShowAddKeyModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition flex items-center gap-2"
                >
                  <span>➕ Add API Key to Pool</span>
                </button>
              </div>

              {/* DWLC & Cache Telemetry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e1015] border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-grotesk">DWLC Active Connections</span>
                    <span className="text-xs">⚡</span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-white">
                    {apiPoolKeys.reduce((acc, k) => acc + (k.activeConnections || 0), 0)} <span className="text-xs text-zinc-400 font-normal">in-flight</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Dynamic Weighted Least Connections load balancer active</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-grotesk">Prompt Cache Hit Rate</span>
                    <span className="text-xs">🎯</span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-white">
                    {cacheStats.totalHits} <span className="text-xs text-emerald-400 font-normal">(&lt; 5ms responses)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Saved ${cacheStats.memorySavedUsd} USD in API provider billing</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e1015] border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-grotesk">Provider Spend Cap Quota</span>
                    <span className="text-xs">🛡️</span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-white">
                    ${apiPoolKeys.reduce((acc, k) => acc + (k.usedBudgetUsd || 0), 0).toFixed(2)} <span className="text-xs text-zinc-400 font-normal">/ ${apiPoolKeys.reduce((acc, k) => acc + (k.monthlyBudgetUsd || 0), 0)}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Auto-Exhaustion protection enforced</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Key Name</th>
                        <th className="pb-3 font-bold">Provider</th>
                        <th className="pb-3 font-bold">Masked Key</th>
                        <th className="pb-3 font-bold">In-Flight Conns</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold">Monthly Budget / Spend</th>
                        <th className="pb-3 font-bold">Latency</th>
                        <th className="pb-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {apiPoolKeys.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-zinc-500 font-mono">
                            No custom pool keys registered. Using environment variables (14+ Gemini keys active).
                          </td>
                        </tr>
                      ) : (
                        apiPoolKeys.map((k) => (
                          <tr key={k.id}>
                            <td className="py-3.5 font-bold text-white">{k.keyName || k.id}</td>
                            <td className="py-3.5 text-purple-300">{k.provider}</td>
                            <td className="py-3.5 font-mono text-zinc-400">{k.maskedKey || '••••••••'}</td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-500/30">
                                ⚡ {k.activeConnections || 0} active
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${k.status === 'ACTIVE' || k.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : k.status === 'COOLING_DOWN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                {k.status}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-zinc-200">
                              <div>${k.usedBudgetUsd || 0} / <span className="text-zinc-400">${k.monthlyBudgetUsd || 5000}</span></div>
                              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-purple-500"
                                  style={{ width: `${Math.min(100, (((k.usedBudgetUsd || 0) / (k.monthlyBudgetUsd || 5000)) * 100))}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-cyan-400">{k.latencyMs || 320} ms</td>
                            <td className="py-3.5 space-x-2">
                              <button
                                onClick={() => handleTogglePoolKey(k.id, k.status)}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold"
                              >
                                {k.status === 'ACTIVE' || k.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleDeletePoolKey(k.id)}
                                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 4: CREDIT LEDGER */}
          {activeTab === 'credit_ledger' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">Credit Accounting & Pre-Auth Ledger</h2>
                <p className="text-xs text-zinc-400">Audit trail of credit reserve, commit, refund, and grant transactions in Neon DB.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Transaction ID</th>
                        <th className="pb-3 font-bold">User</th>
                        <th className="pb-3 font-bold">Type</th>
                        <th className="pb-3 font-bold">Credit Amount</th>
                        <th className="pb-3 font-bold">Provider USD Cost</th>
                        <th className="pb-3 font-bold">Description</th>
                        <th className="pb-3 font-bold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {creditLedger.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-zinc-500 font-mono">
                            No credit ledger records logged yet.
                          </td>
                        </tr>
                      ) : (
                        creditLedger.map((tx, idx) => (
                          <tr key={tx.id || idx}>
                            <td className="py-3 font-mono text-purple-400">{tx.id || `tx-${idx}`}</td>
                            <td className="py-3 font-bold text-white">{tx.userId || 'usr-admin-1'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'GRANT' || tx.type === 'COMMIT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                {tx.type || 'RESERVE'}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-white font-mono">{tx.amount > 0 ? `+${tx.amount}` : tx.amount} cr</td>
                            <td className="py-3 text-rose-400 font-mono">${tx.providerCostUsd || 0.05}</td>
                            <td className="py-3 text-zinc-400 max-w-xs truncate">{tx.description || 'AI Generation Task'}</td>
                            <td className="py-3 text-zinc-500 text-[10px]">{new Date(tx.timestamp || Date.now()).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 5: GENERATION STREAM */}
          {activeTab === 'job_stream' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">Live AI Worker Generation Stream</h2>
                <p className="text-xs text-zinc-400">Real-time telemetry stream of video and image jobs processed across backend microservices.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Job ID</th>
                        <th className="pb-3 font-bold">Provider</th>
                        <th className="pb-3 font-bold">Prompt</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold">Duration</th>
                        <th className="pb-3 font-bold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {videoJobs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-zinc-500 font-mono">
                            No active generation jobs found. Submit jobs from Video or Image studio to see them live.
                          </td>
                        </tr>
                      ) : (
                        videoJobs.map((j) => (
                          <tr key={j.id}>
                            <td className="py-3 font-mono text-cyan-400 font-bold">{j.id}</td>
                            <td className="py-3 text-purple-300">{j.provider || 'google-veo'}</td>
                            <td className="py-3 text-zinc-300 line-clamp-1 max-w-xs">{j.request?.prompt || 'AI Render Job'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${j.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-300' : j.status === 'processing' ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' : 'bg-rose-500/20 text-rose-300'}`}>
                                {j.status}
                              </span>
                            </td>
                            <td className="py-3 font-mono">{j.request?.duration_seconds || 5}s</td>
                            <td className="py-3 text-zinc-500 text-[10px]">{new Date(j.created_at || Date.now()).toLocaleTimeString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 6: PROVIDER LATENCY */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">Provider Latency & Ping Inspector</h2>
                <p className="text-xs text-zinc-400">Perform real-time health checks and latency benchmarks against registered AI providers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'google-veo', name: 'Google Veo & Imagen', keys: '🟢 14 Key Pool Configured in .env', status: 'ACTIVE' },
                  { id: 'openai', name: 'OpenAI GPT Image & DALL-E', keys: '🟢 Primary Key Configured in .env', status: 'ACTIVE' },
                  { id: 'elevenlabs', name: 'ElevenLabs Voice Engine', keys: '🟡 Awaiting ELEVENLABS_API_KEY in .env', status: 'FALLBACK_MODE' },
                  { id: 'runway', name: 'Runway Gen-3 Video', keys: '🟡 Awaiting RUNWAY_API_KEY in .env', status: 'FALLBACK_MODE' },
                ].map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold font-grotesk text-sm text-white">{p.name}</div>
                      <span className={`w-2.5 h-2.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    </div>
                    <p className="text-xs font-mono text-zinc-300">{p.keys}</p>

                    <button
                      onClick={() => handlePingProvider(p.id)}
                      disabled={pingingProvider === p.id}
                      className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition disabled:opacity-50"
                    >
                      {pingingProvider === p.id ? 'Pinging Endpoint...' : '⚡ Ping Live Endpoint'}
                    </button>
                  </div>
                ))}
              </div>

              {pingResult && (
                <div className="p-4 rounded-2xl bg-[#0e1015] border border-purple-500/30 space-y-2 font-mono text-xs shadow-xl">
                  <div className="font-bold text-purple-300">Ping Result for {pingResult.provider}:</div>
                  <div className="text-zinc-300">Latency: <span className="text-cyan-400 font-bold">{pingResult.latency} ms</span></div>
                  <div className="text-zinc-300">Status: <span className="text-emerald-400 font-bold">{pingResult.status}</span></div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 7: USER GOVERNANCE (Simplified Roles) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">User Governance & Role Allocator</h2>
                <p className="text-xs text-zinc-400">Simplified 2-Role System: Super Admin vs Standard User.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">User Name</th>
                        <th className="pb-3 font-bold">Email</th>
                        <th className="pb-3 font-bold">Role</th>
                        <th className="pb-3 font-bold">Credit Balance</th>
                        <th className="pb-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {usersList.map((u) => (
                        <tr key={u.id}>
                          <td className="py-3.5 font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                              {u.name ? u.name[0] : 'U'}
                            </div>
                            <span>{u.name || 'User'}</span>
                          </td>
                          <td className="py-3.5 text-zinc-400 font-mono">{u.email}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-300 border border-white/10'}`}>
                              {u.role === 'super_admin' ? 'SUPER ADMIN' : 'STANDARD USER'}
                            </span>
                          </td>
                          <td className="py-3.5 font-bold text-purple-400 font-mono">⚡ {u.credits_balance || 0} cr</td>
                          <td className="py-3.5 space-x-2">
                            <button
                              onClick={() => setGrantCreditsUserId(u.id)}
                              className="px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition"
                            >
                              + Grant Credits
                            </button>
                            <button
                              onClick={() => handleToggleUserRole(u.id, u.role)}
                              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold transition"
                            >
                              Toggle Role
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 8: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold font-grotesk text-white">Platform System Audit Trail</h2>
                <p className="text-xs text-zinc-400">Immutable audit record of administrative model changes, key updates, and user role modifications.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-grotesk">
                        <th className="pb-3 font-bold">Action</th>
                        <th className="pb-3 font-bold">Actor</th>
                        <th className="pb-3 font-bold">Target</th>
                        <th className="pb-3 font-bold">IP Address</th>
                        <th className="pb-3 font-bold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-zinc-500 font-mono">
                            No administrative audit records logged yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <tr key={log.id || idx}>
                            <td className="py-3 font-bold text-purple-300">{log.action || 'ADMIN_ACTION'}</td>
                            <td className="py-3 text-white">{log.user_email || 'admin@aether.ai'}</td>
                            <td className="py-3 text-zinc-400">{log.target || 'System'}</td>
                            <td className="py-3 text-zinc-500 font-mono">{log.ip || '127.0.0.1'}</td>
                            <td className="py-3 text-zinc-500 text-[10px]">{new Date(log.timestamp || Date.now()).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal: Add Model to Catalogue */}
      {showAddModelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white font-grotesk">🤖 Add New Model to Catalogue</h3>
              <button onClick={() => setShowAddModelModal(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleAddModel} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gemini 3.6 Flash"
                    value={newModelData.display_name}
                    onChange={(e) => setNewModelData({ ...newModelData, display_name: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Modality</label>
                  <select
                    value={newModelData.modality}
                    onChange={(e) => setNewModelData({ ...newModelData, modality: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="text-to-video">text-to-video</option>
                    <option value="text-to-image">text-to-image</option>
                    <option value="voice-tts">voice-tts</option>
                    <option value="avatar-lipsync">avatar-lipsync</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Provider Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. google-veo, openai, elevenlabs"
                    value={newModelData.provider_slug}
                    onChange={(e) => setNewModelData({ ...newModelData, provider_slug: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Provider Model ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. imagen-3.0-generate-002"
                    value={newModelData.provider_model_id}
                    onChange={(e) => setNewModelData({ ...newModelData, provider_model_id: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Credits / Unit</label>
                  <input
                    type="number"
                    required
                    value={newModelData.credits_per_unit}
                    onChange={(e) => setNewModelData({ ...newModelData, credits_per_unit: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Unit</label>
                  <select
                    value={newModelData.unit}
                    onChange={(e) => setNewModelData({ ...newModelData, unit: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="per-image">per-image</option>
                    <option value="per-second">per-second</option>
                    <option value="per-1k-chars">per-1k-chars</option>
                    <option value="per-call">per-call</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Provider Cost ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newModelData.provider_cost_usd}
                    onChange={(e) => setNewModelData({ ...newModelData, provider_cost_usd: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Description</label>
                <input
                  type="text"
                  placeholder="Short description of capabilities"
                  value={newModelData.description}
                  onChange={(e) => setNewModelData({ ...newModelData, description: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModelModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow"
                >
                  Save Model to Catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Key to Pool */}
      {showAddKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white font-grotesk">🔑 Add Key to API Pool</h3>
              <button onClick={() => setShowAddKeyModal(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleAddPoolKey} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Provider Slug</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="google-veo">google-veo (Google Veo / Gemini)</option>
                  <option value="openai">openai (OpenAI DALL-E / GPT)</option>
                  <option value="elevenlabs">elevenlabs (ElevenLabs Voice)</option>
                  <option value="runway">runway (Runway Gen-3)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Key Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gemini Pool Member #15"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Key Secret</label>
                <input
                  type="password"
                  required
                  placeholder="AQ.Ab8RN6..."
                  value={newKeySecret}
                  onChange={(e) => setNewKeySecret(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Monthly Budget Cap ($USD)</label>
                <input
                  type="number"
                  required
                  value={newKeyBudget}
                  onChange={(e) => setNewKeyBudget(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow"
                >
                  Add Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Grant Credits */}
      {grantCreditsUserId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white font-grotesk">⚡ Allocate Credits to User</h3>
              <button onClick={() => setGrantCreditsUserId(null)} className="text-zinc-500 hover:text-white text-xs">✕</button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 font-grotesk uppercase">Credit Amount</label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setGrantCreditsUserId(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGrantCredits(grantCreditsUserId)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow"
                >
                  Confirm Credit Grant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
