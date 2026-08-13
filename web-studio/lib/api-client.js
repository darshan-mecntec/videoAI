const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('3000')) 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:3001';
const ASSET_API_URL = process.env.NEXT_PUBLIC_ASSET_API_URL || 'http://localhost:3006';
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3008';
const PROJECT_API_URL = process.env.NEXT_PUBLIC_PROJECT_API_URL || 'http://localhost:3009';
const VIDEO_API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || 'http://localhost:3011';
const AVATAR_API_URL = process.env.NEXT_PUBLIC_AVATAR_API_URL || 'http://localhost:3014';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      if (contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error?.message || errorMessage;
        } catch (_) {}
      }
      throw new Error(errorMessage);
    }

    if (contentType.includes('application/json')) {
      return response.json();
    }
    return {};
  }

  // Provider endpoints
  async getProviders(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.cursor) params.append('cursor', options.cursor);

    const result = await this.request(`/v1/providers?${params.toString()}`);
    return result;
  }

  async getProvider(id) {
    const result = await this.request(`/v1/providers/${id}`);
    return result;
  }

  async createProvider(data) {
    // For development, we send the api_key if provided
    // For production, api_key should be empty and vault path used
    const payload = {
      slug: data.slug,
      display_name: data.display_name,
      region_codes: data.region_codes,
      org_id: data.org_id,
      credential: {
        secret_key: data.secret_key,
        api_key: data.api_key || undefined,
        environment: data.environment || 'production'
      }
    };
    
    const result = await this.request('/v1/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result;
  }

  async updateProvider(id, data) {
    // For development, we send the api_key if provided
    // For production, api_key should be empty and vault path used
    const payload = {
      slug: data.slug,
      display_name: data.display_name,
      region_codes: data.region_codes,
      org_id: data.org_id,
      credential: {
        secret_key: data.secret_key,
        api_key: data.api_key || undefined,
        environment: data.environment || 'production'
      }
    };
    
    return this.request(`/v1/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteProvider(id) {
    return this.request(`/v1/providers/${id}`, {
      method: 'DELETE',
    });
  }

  // Capability endpoints
  async getCapabilities(type, region) {
    const params = new URLSearchParams();
    params.append('type', type);
    if (region) params.append('region', region);

    return this.request(`/v1/capabilities?${params.toString()}`);
  }

  async getProviderCapabilities(providerId) {
    return this.request(`/v1/providers/${providerId}/capabilities`);
  }

  async addCapability(providerId, data) {
    return this.request(`/v1/providers/${providerId}/capabilities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCapability(providerId, capabilityId, data) {
    return this.request(`/v1/providers/${providerId}/capabilities/${capabilityId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Health endpoints
  async getHealthSummary() {
    return this.request('/v1/providers/health-summary');
  }

  async getProviderHealth(providerId) {
    return this.request(`/v1/providers/${providerId}/health`);
  }

  async recordHealthCheck(providerId, data) {
    return this.request(`/v1/providers/${providerId}/health-check`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Pricing endpoints
  async getProviderPricing(providerId) {
    return this.request(`/v1/providers/${providerId}/pricing`);
  }

  async addPricingEntry(providerId, data) {
    return this.request(`/v1/providers/${providerId}/pricing`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Rate limit endpoints
  async getProviderRateLimits(providerId) {
    return this.request(`/v1/providers/${providerId}/rate-limits`);
  }

  async updateRateLimits(providerId, limits) {
    return this.request(`/v1/providers/${providerId}/rate-limits`, {
      method: 'PUT',
      body: JSON.stringify({ limits }),
    });
  }

  async autoDiscoverCapabilities(providerId) {
    return this.request(`/v1/providers/${providerId}/auto-discover`, {
      method: 'POST',
    });
  }

  // Asset Service endpoints
  async getAssets(options = {}) {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.project_id) params.append('project_id', options.project_id);

    const response = await fetch(`${ASSET_API_URL}/v1/assets?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch assets');
    }
    return response.json();
  }

  async getAsset(id) {
    const response = await fetch(`${ASSET_API_URL}/v1/assets/${id}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch asset details');
    }
    return response.json();
  }

  async createAsset(data) {
    const response = await fetch(`${ASSET_API_URL}/v1/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create asset');
    }
    return response.json();
  }

  // Auth Service endpoints
  async login(email) {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Login failed');
    }
    return response.json();
  }

  async getCurrentUser(userId) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const response = await fetch(`${AUTH_API_URL}/v1/auth/me?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch current user');
    }
    return response.json();
  }

  async getOrgs() {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/orgs`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch organizations');
    }
    return response.json();
  }

  async getApiKeys(orgId) {
    const params = new URLSearchParams();
    if (orgId) params.append('org_id', orgId);
    const response = await fetch(`${AUTH_API_URL}/v1/auth/api-keys?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch API keys');
    }
    return response.json();
  }

  async createApiKey(orgId, name) {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, name }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create API key');
    }
    return response.json();
  }

  // Project Service endpoints
  async getProjects(orgId) {
    const params = new URLSearchParams();
    if (orgId) params.append('org_id', orgId);
    const response = await fetch(`${PROJECT_API_URL}/v1/projects?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch projects');
    }
    return response.json();
  }

  async createProject(data) {
    const response = await fetch(`${PROJECT_API_URL}/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create project');
    }
    return response.json();
  }

  // Metrics Service endpoint
  async getMetrics() {
    const response = await fetch(`${METRICS_API_URL}/v1/metrics/aggregate`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch metrics');
    }
    return response.json();
  }

  // ─── Video Service endpoints (:3011) ─────────────────────────────────────

  async getVideoProviders() {
    const response = await fetch(`${VIDEO_API_URL}/v1/video/providers`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch video providers');
    }
    return response.json();
  }

  async submitVideoGeneration(data) {
    const response = await fetch(`${VIDEO_API_URL}/v1/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to submit video generation job');
    }
    return response.json();
  }

  async getVideoJob(jobId) {
    const response = await fetch(`${VIDEO_API_URL}/v1/video/jobs/${jobId}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch video job status');
    }
    return response.json();
  }

  async cancelVideoJob(jobId) {
    const response = await fetch(`${VIDEO_API_URL}/v1/video/jobs/${jobId}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to cancel video job');
    }
    return response.json();
  }

  async estimateVideoCost(data) {
    const response = await fetch(`${VIDEO_API_URL}/v1/video/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch video cost estimate');
    }
    return response.json();
  }



  // ─── Project Version Control endpoints (:3009) ───────────────────────────

  async getProjectVersions(projectId) {
    const response = await fetch(`${PROJECT_API_URL}/v1/projects/${projectId}/versions`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch project versions');
    }
    return response.json();
  }

  async saveProjectVersion(projectId, assetUrl, snapshotNote) {
    const response = await fetch(`${PROJECT_API_URL}/v1/projects/${projectId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_url: assetUrl, snapshot_note: snapshotNote }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to save project version');
    }
    return response.json();
  }

  async restoreProjectVersion(projectId, versionId) {
    const response = await fetch(`${PROJECT_API_URL}/v1/projects/${projectId}/versions/${versionId}/restore`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to restore project version');
    }
    return response.json();
  }

  // ─── RBAC Governance endpoints (:3008) ───────────────────────────

  async getUsers(orgId = 'org-cybertech-1') {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/users?org_id=${orgId}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch users');
    }
    return response.json();
  }

  async updateUserRole(userId, role) {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to update user role');
    }
    return response.json();
  }

  async getRolesMatrix() {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/roles`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch roles matrix');
    }
    return response.json();
  }

  async getAuditLogs(orgId = 'org-cybertech-1') {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/audit-log?org_id=${orgId}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch audit log');
    }
    return response.json();
  }

  async createInvite(email, role = 'editor', orgId = 'org-cybertech-1') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('aether_token') : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${AUTH_API_URL}/v1/auth/invites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, role, org_id: orgId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create invite');
    }
    return response.json();
  }

  async getInvites(orgId = 'org-cybertech-1') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('aether_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${AUTH_API_URL}/v1/auth/invites?org_id=${orgId}`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch invites');
    }
    return response.json();
  }

  async updateOrgConcurrency(orgId = 'org-cybertech-1', maxConcurrentJobs = 5) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('aether_token') : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${AUTH_API_URL}/v1/auth/orgs/${orgId}/concurrency`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ max_concurrent_jobs: maxConcurrentJobs }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update org concurrency limit');
    }
    return response.json();
  }
  async getPoolTelemetry() {
    const response = await fetch(`${API_BASE_URL}/v1/pools/telemetry`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch pool telemetry');
    }
    return response.json();
  }

  async getPoolKeys(provider) {
    const params = provider ? `?provider=${provider}` : '';
    const response = await fetch(`${API_BASE_URL}/v1/pools/keys${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch pool keys');
    }
    return response.json();
  }

  async addPoolKey(data) {
    const response = await fetch(`${API_BASE_URL}/v1/pools/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to add pool key');
    }
    return response.json();
  }

  async updatePoolKey(keyId, data) {
    const response = await fetch(`${API_BASE_URL}/v1/pools/keys/${keyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update pool key');
    }
    return response.json();
  }

  async deletePoolKey(keyId) {
    const response = await fetch(`${API_BASE_URL}/v1/pools/keys/${keyId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to delete pool key');
    }
    return response.json();
  }

  async togglePoolKey(keyId) {
    const response = await fetch(`${API_BASE_URL}/v1/pools/keys/${keyId}/toggle`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to toggle pool key status');
    }
    return response.json();
  }

  async getModelPricing() {
    const response = await fetch(`${AUTH_API_URL}/v1/credits/pricing`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch model pricing');
    }
    return response.json();
  }

  async updateModelPricing(modelId, providerCostUsd, profitMarginPercent) {
    const response = await fetch(`${AUTH_API_URL}/v1/credits/pricing/${modelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerCostUsd, profitMarginPercent }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update model pricing');
    }
    return response.json();
  }

  async updateUserCredits(userId, amount, operation = 'add') {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, operation }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update user credits');
    }
    return response.json();
  }

  async toggleUserStatus(userId) {
    const response = await fetch(`${AUTH_API_URL}/v1/auth/users/${userId}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to toggle user status');
    }
    return response.json();
  }

  async uploadAsset(filename, fileData, type = 'image') {
    const response = await fetch(`${ASSET_API_URL}/v1/assets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, file_data: fileData, type }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to upload asset');
    }
    return response.json();
  }

  // --- Avatar & Voice Studio Endpoints ---
  async getAvatars(userId) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const response = await fetch(`${AVATAR_API_URL}/v1/avatars?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch avatars');
    }
    return response.json();
  }

  async createAvatar(data) {
    const response = await fetch(`${AVATAR_API_URL}/v1/avatars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create avatar');
    }
    return response.json();
  }

  async deleteAvatar(id) {
    const response = await fetch(`${AVATAR_API_URL}/v1/avatars/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to delete avatar');
    }
    return response.json();
  }

  async getVoices(userId) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const response = await fetch(`${AVATAR_API_URL}/v1/voices?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch voices');
    }
    return response.json();
  }

  async createVoice(data) {
    const response = await fetch(`${AVATAR_API_URL}/v1/voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create cloned voice');
    }
    return response.json();
  }

  async deleteVoice(id) {
    const response = await fetch(`${AVATAR_API_URL}/v1/voices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to delete voice');
    }
    return response.json();
  }

  async generateAvatarVideo(data) {
    const response = await fetch(`${AVATAR_API_URL}/v1/avatar-videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to generate avatar video');
    }
    return response.json();
  }

  async getAvatarVideoStatus(id) {
    const response = await fetch(`${AVATAR_API_URL}/v1/avatar-videos/${id}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to get avatar video status');
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();

