'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth-provider';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'apikeys' | 'webhooks' | 'billing'

  // Credit Ledger State
  const [ledger, setLedger] = useState([]);
  const [analytics, setAnalytics] = useState({ totalCreditsConsumed: 0, totalProviderCostUsd: 0, byModel: {} });
  const [loadingLedger, setLoadingLedger] = useState(false);

  // API Key State
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('*');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Webhook State
  const [webhooks, setWebhooks] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Billing State
  const [buyingPack, setBuyingPack] = useState(null);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState('');

  // Fetch Data from Auth Service (port 3008)
  const fetchLedgerAndAnalytics = async () => {
    setLoadingLedger(true);
    try {
      const token = localStorage.getItem('aether_token');
      const headers = { Authorization: token ? `Bearer ${token}` : '' };

      const [resLedger, resAnalytics] = await Promise.all([
        fetch('http://localhost:3008/v1/credits/ledger', { headers }).then(r => r.json()),
        fetch('http://localhost:3008/v1/credits/analytics', { headers }).then(r => r.json()),
      ]);

      if (resLedger.records) setLedger(resLedger.records);
      if (resAnalytics.analytics) setAnalytics(resAnalytics.analytics);
    } catch (err) {
      console.error('Failed to fetch credit ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch('http://localhost:3008/v1/auth/api-keys', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }).then(r => r.json());
      if (res.api_keys) setApiKeys(res.api_keys);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch('http://localhost:3008/v1/webhooks', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }).then(r => r.json());
      if (res.webhooks) setWebhooks(res.webhooks);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    }
  };

  useEffect(() => {
    fetchLedgerAndAnalytics();
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  // Handle API Key Creation
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch('http://localhost:3008/v1/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ name: newKeyName, scopes: [newKeyScope] }),
      }).then(r => r.json());

      if (res.api_key) {
        setCreatedSecret(res.api_key.secret_raw || 'ak_live_sample_secret');
        fetchApiKeys();
      }
    } catch (err) {
      alert('Failed to create API key: ' + err.message);
    }
  };

  // Handle API Key Revocation
  const handleRevokeKey = async (id) => {
    if (!confirm('Are you sure you want to revoke this API Key? Any application using it will fail.')) return;
    try {
      const token = localStorage.getItem('aether_token');
      await fetch(`http://localhost:3008/v1/auth/api-keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      fetchApiKeys();
    } catch (err) {
      alert('Failed to revoke API key');
    }
  };

  // Handle Webhook Creation
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch('http://localhost:3008/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ url: webhookUrl, description: webhookDesc, events: ['job.completed', 'job.failed'] }),
      }).then(r => r.json());

      if (res.webhook) {
        setShowWebhookModal(false);
        setWebhookUrl('');
        setWebhookDesc('');
        fetchWebhooks();
      }
    } catch (err) {
      alert('Failed to create webhook');
    }
  };

  // Handle Webhook Test Ping
  const handleTestWebhook = async (id) => {
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch(`http://localhost:3008/v1/webhooks/${id}/test`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }).then(r => r.json());

      setTestResult({ id, ...res });
    } catch (err) {
      alert('Webhook test failed');
    }
  };

  // Handle Stripe Credit Pack Purchase
  const handlePurchasePack = async (packId, creditsAmount) => {
    setBuyingPack(packId);
    try {
      const token = localStorage.getItem('aether_token');
      const res = await fetch('http://localhost:3008/v1/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'mock.payment.success',
          data: { object: { metadata: { user_id: user?.id || 'usr-admin-1', credits: creditsAmount } } },
        }),
      }).then(r => r.json());

      if (res.received) {
        setTopupSuccessMsg(`Successfully added ${creditsAmount.toLocaleString()} credits to your account!`);
        setTimeout(() => setTopupSuccessMsg(''), 5000);
        fetchLedgerAndAnalytics();
      }
    } catch (err) {
      alert('Checkout error');
    } finally {
      setBuyingPack(null);
    }
  };

  return (
    <div className="flex-1 bg-[#0b0c0e] p-4 sm:p-8 text-zinc-100 font-sans max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-grotesk tracking-tight uppercase flex items-center gap-3">
            <span>⚙️ Account & Developer Portal</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage API keys, credit ledger history, webhooks, and billing quotas.</p>
        </div>

        {/* User Balance Card */}
        <div className="bg-[#14161b] border border-cyan-500/30 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-lg shadow-cyan-950/20">
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">Credit Balance</div>
            <div className="text-2xl font-black text-cyan-400 font-grotesk">
              ⚡ {(user?.credits_balance || 10000).toLocaleString()} <span className="text-xs text-zinc-400 font-normal">(${( (user?.credits_balance || 10000) * 0.02 ).toFixed(2)} USD)</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('billing')}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            + Buy Credits
          </button>
        </div>
      </div>

      {topupSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span>✅</span> {topupSuccessMsg}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-1 font-grotesk text-sm">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-t-xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-[#181a20] text-cyan-400 border-t-2 border-cyan-400' : 'text-zinc-400 hover:text-white'}`}
        >
          📊 Credit Ledger & Analytics
        </button>
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`px-4 py-2.5 rounded-t-xl font-bold transition-all ${activeTab === 'apikeys' ? 'bg-[#181a20] text-purple-400 border-t-2 border-purple-400' : 'text-zinc-400 hover:text-white'}`}
        >
          🔑 API Key Governance
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2.5 rounded-t-xl font-bold transition-all ${activeTab === 'webhooks' ? 'bg-[#181a20] text-amber-400 border-t-2 border-amber-400' : 'text-zinc-400 hover:text-white'}`}
        >
          🔔 Webhook Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 rounded-t-xl font-bold transition-all ${activeTab === 'billing' ? 'bg-[#181a20] text-emerald-400 border-t-2 border-emerald-400' : 'text-zinc-400 hover:text-white'}`}
        >
          💳 Credit Packs & Subscription
        </button>
      </div>

      {/* TAB 1: CREDIT LEDGER & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#14161c] border border-white/10 rounded-2xl p-5">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Total Credits Consumed</div>
              <div className="text-3xl font-extrabold text-white mt-1 font-grotesk">{analytics.totalCreditsConsumed.toLocaleString()} ⚡</div>
              <div className="text-xs text-zinc-500 mt-1">Across all models & workflows</div>
            </div>
            <div className="bg-[#14161c] border border-white/10 rounded-2xl p-5">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Est. Provider Cost (USD)</div>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1 font-grotesk">${analytics.totalProviderCostUsd.toFixed(2)}</div>
              <div className="text-xs text-zinc-500 mt-1">Direct AI vendor execution spend</div>
            </div>
            <div className="bg-[#14161c] border border-white/10 rounded-2xl p-5">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Active Models Used</div>
              <div className="text-3xl font-extrabold text-purple-400 mt-1 font-grotesk">{Object.keys(analytics.byModel).length} Models</div>
              <div className="text-xs text-zinc-500 mt-1">Veo 3.1, Sora 2, Kling 3.0, GPT-Image</div>
            </div>
          </div>

          {/* Ledger History Table */}
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white font-grotesk">📜 Persistent Credit Ledger Log</h2>
              <button onClick={fetchLedgerAndAnalytics} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 font-mono">
                🔄 Refresh Ledger
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider bg-white/[0.02]">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Model / Action</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Est. Cost (USD)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {ledger.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 text-zinc-400">{new Date(rec.timestamp).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.type === 'TOPUP' || rec.type === 'GRANT' ? 'bg-emerald-500/20 text-emerald-400' :
                          rec.type === 'REFUND' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {rec.type}
                        </span>
                      </td>
                      <td className="p-3 font-sans font-medium text-white">
                        {rec.modelId ? <span className="font-mono text-purple-400 mr-2">[{rec.modelId}]</span> : null}
                        {rec.description}
                      </td>
                      <td className={`p-3 text-right font-bold ${rec.type === 'TOPUP' || rec.type === 'GRANT' || rec.type === 'REFUND' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {rec.type === 'TOPUP' || rec.type === 'GRANT' || rec.type === 'REFUND' ? '+' : '-'}{rec.amount} ⚡
                      </td>
                      <td className="p-3 text-zinc-400">${rec.providerCostUsd ? rec.providerCostUsd.toFixed(4) : '0.0000'}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-zinc-500">No credit ledger records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API KEY GOVERNANCE */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-white font-grotesk">🔑 API Keys Governance</h2>
              <p className="text-xs text-zinc-400">Scoped production API keys for programmatic access with SHA-256 security.</p>
            </div>
            <button
              onClick={() => { setShowKeyModal(true); setCreatedSecret(null); }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              + Create New API Key
            </button>
          </div>

          {/* API Keys Table */}
          <div className="bg-[#14161c] border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider bg-white/[0.02]">
                  <th className="p-4">Key Name</th>
                  <th className="p-4">Key Hint</th>
                  <th className="p-4">Permission Scopes</th>
                  <th className="p-4">Last Used</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold font-sans text-white">{k.name}</td>
                    <td className="p-4 text-purple-400 font-mono">{k.key_hint}</td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {(k.scopes || ['*']).map((s) => (
                          <span key={s} className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                        {k.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {k.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-sans hover:underline"
                        >
                          Revoke Key
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key Creation Modal */}
          {showKeyModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#181a20] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
                <h3 className="text-xl font-bold text-white font-grotesk">Create Scoped API Key</h3>

                {!createdSecret ? (
                  <form onSubmit={handleCreateApiKey} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Key Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Production Video Generator Bot"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="w-full bg-[#0d0e11] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Scope Restriction</label>
                      <select
                        value={newKeyScope}
                        onChange={(e) => setNewKeyScope(e.target.value)}
                        className="w-full bg-[#0d0e11] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                      >
                        <option value="*">Full Access (*)</option>
                        <option value="video:generate">Video Generation Only (video:generate)</option>
                        <option value="credits:view">Read Credits & Usage Only (credits:view)</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowKeyModal(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs"
                      >
                        Generate Key
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs">
                      ⚠️ <strong>Save your secret key now!</strong> It will never be displayed again.
                    </div>
                    <div className="bg-[#0d0e11] border border-white/10 p-3 rounded-xl font-mono text-xs text-purple-300 break-all select-all">
                      {createdSecret}
                    </div>
                    <button
                      onClick={() => { setShowKeyModal(false); setCreatedSecret(null); }}
                      className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-xl text-xs"
                    >
                      I Have Saved My Secret
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-white font-grotesk">🔔 Webhook Subscriptions</h2>
              <p className="text-xs text-zinc-400">Receive HTTP POST signatures (`X-Signature-256`) when video renders finish.</p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              + Add Webhook Endpoint
            </button>
          </div>

          {/* Webhooks List */}
          <div className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.id} className="bg-[#14161c] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-base font-bold text-white font-grotesk">{w.description}</div>
                    <div className="text-xs font-mono text-amber-400 mt-0.5">{w.url}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestWebhook(w.id)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg font-mono"
                    >
                      ⚡ Test Ping
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 border-t border-white/5 pt-3">
                  <div>Secret: <span className="text-zinc-200">{w.secret}</span></div>
                  <div>Events: <span className="text-purple-300">[{w.events.join(', ')}]</span></div>
                </div>
              </div>
            ))}
            {webhooks.length === 0 && (
              <div className="bg-[#14161c] border border-white/10 rounded-2xl p-8 text-center text-zinc-500">
                No webhooks registered yet.
              </div>
            )}
          </div>

          {/* Webhook Test Response Box */}
          {testResult && (
            <div className="bg-[#181a20] border border-amber-500/40 rounded-2xl p-5 space-y-2 font-mono text-xs">
              <div className="text-amber-400 font-bold">✅ Webhook Ping Dispatched Successfully!</div>
              <div className="text-zinc-300">Dispatched Event: <span className="text-white">{testResult.dispatched_event}</span></div>
              <div className="text-zinc-400 break-all">Header `X-Signature-256`: <span className="text-emerald-400">{testResult.signature_header}</span></div>
            </div>
          )}

          {/* Modal */}
          {showWebhookModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateWebhook} className="bg-[#181a20] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <h3 className="text-xl font-bold text-white font-grotesk">Add Webhook Endpoint</h3>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Payload Callback URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.yourcompany.com/webhooks/aether"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-[#0d0e11] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Render Done Notification Handler"
                    value={webhookDesc}
                    onChange={(e) => setWebhookDesc(e.target.value)}
                    className="w-full bg-[#0d0e11] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowWebhookModal(false)} className="flex-1 bg-white/5 text-zinc-300 font-bold py-2.5 rounded-xl text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs">
                    Save Webhook
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BILLING & CREDIT PACKS */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-extrabold text-white font-grotesk">💳 Stripe Credit Top-Up Packs</h2>
            <p className="text-xs text-zinc-400">Instant credit top-ups with zero expiration. Consumed after subscription quota.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 space-y-5 text-center flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div className="space-y-2">
                <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Starter Pack</div>
                <div className="text-4xl font-black text-white font-grotesk">500 ⚡</div>
                <div className="text-2xl font-bold text-cyan-400">$10 USD</div>
                <p className="text-xs text-zinc-400">Ideal for 15s of standard 1080p video or 50 HD images.</p>
              </div>
              <button
                disabled={buyingPack === '500_credits'}
                onClick={() => handlePurchasePack('500_credits', 500)}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg"
              >
                {buyingPack === '500_credits' ? 'Processing...' : 'Buy 500 Credits ($10)'}
              </button>
            </div>

            <div className="bg-[#161922] border-2 border-purple-500/80 rounded-2xl p-6 space-y-5 text-center flex flex-col justify-between relative shadow-xl shadow-purple-950/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] uppercase font-bold font-mono px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <div className="space-y-2">
                <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Pro Creator Pack</div>
                <div className="text-4xl font-black text-white font-grotesk">1,500 ⚡</div>
                <div className="text-2xl font-bold text-purple-400">$25 USD</div>
                <p className="text-xs text-zinc-400">Generate 50s of 1080p video + voiceover tracks.</p>
              </div>
              <button
                disabled={buyingPack === '1500_credits'}
                onClick={() => handlePurchasePack('1500_credits', 1500)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg"
              >
                {buyingPack === '1500_credits' ? 'Processing...' : 'Buy 1,500 Credits ($25)'}
              </button>
            </div>

            <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 space-y-5 text-center flex flex-col justify-between hover:border-emerald-500/50 transition-all">
              <div className="space-y-2">
                <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Studio Volume Pack</div>
                <div className="text-4xl font-black text-white font-grotesk">5,000 ⚡</div>
                <div className="text-2xl font-bold text-emerald-400">$75 USD</div>
                <p className="text-xs text-zinc-400">High volume video generation with 25% bonus credits.</p>
              </div>
              <button
                disabled={buyingPack === '5000_credits'}
                onClick={() => handlePurchasePack('5000_credits', 5000)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg"
              >
                {buyingPack === '5000_credits' ? 'Processing...' : 'Buy 5,000 Credits ($75)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
