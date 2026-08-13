import { VideoGenerationRequest, VideoJob, AppError, VideoProviderName } from './types';
import { ProviderRegistry } from './providerRegistry';
import { VideoJobRepository } from '../infra/repository';
import { AbacPolicyEngine, UserAuthContext } from './abacPolicy';

export class VideoService {
  private policyEngine: AbacPolicyEngine;

  constructor(
    private registry: ProviderRegistry,
    private repo: VideoJobRepository
  ) {
    this.policyEngine = new AbacPolicyEngine(repo);
  }

  /**
   * Validates the request, enforces ABAC policy, selects provider via registry, submits real job to provider API.
   */
  async submitGenerationJob(request: VideoGenerationRequest, authContext?: UserAuthContext): Promise<VideoJob> {
    this.validateRequest(request);

    if (authContext) {
      await this.policyEngine.enforceGenerationPolicy(request, authContext);
    }

    const candidateProviders = this.registry.getAllProviders()
      .filter(p => p.supportsStage(request.stage));

    let primaryProvider = await this.registry.resolveProvider(request);
    let job: VideoJob | null = null;
    let lastError: any = null;

    // 1. Try primary selected provider
    try {
      job = await primaryProvider.submitJob(request);
    } catch (err: any) {
      console.warn(`[VideoService] Primary provider '${primaryProvider.id}' failed (${err.message}). Initiating Multi-Provider Cascade Fallback...`);
      lastError = err;
    }

    // 2. Cascade Fallback Chain: Try secondary configured providers if primary fails
    if (!job) {
      for (const fallback of candidateProviders) {
        if (fallback.id === primaryProvider.id) continue;
        try {
          console.log(`[VideoService] 🔄 Cascading fallback to provider '${fallback.id}'...`);
          job = await fallback.submitJob(request);
          if (job) break;
        } catch (fbErr: any) {
          console.warn(`[VideoService] Fallback provider '${fallback.id}' failed (${fbErr.message})`);
          lastError = fbErr;
        }
      }
    }

    if (!job) {
      throw lastError || new AppError(503, 'ALL_PROVIDERS_FAILED', 'All configured AI video providers failed to accept the job.');
    }

    const saved = await this.repo.saveJob(job);
    if (saved.status === 'succeeded' && saved.output_url) {
      this.registerAssetWithAssetService(saved).catch((err) => console.error('[VideoService] Failed to auto-register asset:', err));
    }
    return saved;
  }

  /**
   * Polls the real provider API for current job status and updates our local record.
   */
  async getJobStatus(jobId: string): Promise<VideoJob> {
    const job = await this.repo.findJobById(jobId);
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', `Video job '${jobId}' not found.`);
    }

    // If terminal — no need to re-poll
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }

    const provider = this.registry.getProvider(job.provider);
    if (!provider) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', `Provider '${job.provider}' is no longer available.`);
    }

    const updated = await provider.pollJobStatus(job.provider_job_id, jobId, job.request);
    const saved = await this.repo.updateJob(jobId, updated);
    if (saved.status === 'succeeded' && saved.output_url) {
      this.registerAssetWithAssetService(saved).catch((err) => console.error('[VideoService] Failed to auto-register asset:', err));
    }
    return saved;
  }

  /**
   * Cancels a running job by calling the real provider cancellation endpoint.
   */
  async cancelJob(jobId: string): Promise<VideoJob> {
    const job = await this.repo.findJobById(jobId);
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', `Video job '${jobId}' not found.`);
    }

    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
      throw new AppError(409, 'JOB_ALREADY_TERMINAL', `Job '${jobId}' is already in status '${job.status}' and cannot be cancelled.`);
    }

    const provider = this.registry.getProvider(job.provider);
    if (provider) {
      await provider.cancelJob(job.provider_job_id);
    }

    return this.repo.updateJob(jobId, { status: 'cancelled', updated_at: new Date().toISOString() });
  }

  /**
   * Returns all providers with their configuration and capability status.
   * Un-configured providers show is_configured: false — never returns fake providers.
   */
  async listProviders() {
    return this.registry.getAllProviders().map(p => p.getCapabilityInfo());
  }

  /**
   * Returns cost and latency estimates from configured providers for a given request.
   */
  async estimateCost(request: VideoGenerationRequest) {
    this.validateRequest(request);

    const configured = this.registry.getConfiguredProviders()
      .filter(p => p.supportsStage(request.stage));

    if (configured.length === 0) {
      throw new AppError(
        503,
        'NO_PROVIDERS_CONFIGURED',
        `No providers configured for stage '${request.stage}'.`
      );
    }

    return configured.map(p => p.estimateCost(request));
  }

  async listJobs(orgId?: string): Promise<VideoJob[]> {
    return this.repo.listJobs(orgId);
  }

  private validateRequest(request: VideoGenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'prompt is required and cannot be empty.');
    }
    if (!request.stage) {
      throw new AppError(400, 'INVALID_INPUT', 'stage is required (text_to_video | image_to_video | images_to_video | script_to_video).');
    }
    if (request.stage === 'image_to_video' && !request.image_url) {
      throw new AppError(400, 'INVALID_INPUT', 'image_url is required for image_to_video stage.');
    }
    if (request.stage === 'images_to_video' && (!request.image_urls || request.image_urls.length < 2)) {
      throw new AppError(400, 'INVALID_INPUT', 'image_urls must contain at least 2 images for images_to_video stage.');
    }
    if (request.preferred_provider && !(['openai', 'runway', 'pika', 'luma', 'google_veo', 'kling', 'wan_2_6'] as VideoProviderName[]).includes(request.preferred_provider)) {
      throw new AppError(400, 'INVALID_INPUT', `Unknown provider '${request.preferred_provider}'. Valid options: openai, runway, pika, luma, google_veo, kling, wan_2_6.`);
    }
  }

  private async registerAssetWithAssetService(job: VideoJob): Promise<void> {
    if (!job.output_url) return;
    const assetServiceUrl = process.env.ASSET_SERVICE_URL || 'http://localhost:3006';

    const payload = {
      project_id: job.request.project_id || 'proj-default',
      user_id: job.request.user_id || 'usr-1c94e86b',
      org_id: job.request.org_id || 'org-main-1',
      name: job.request.prompt.substring(0, 50) + (job.request.prompt.length > 50 ? '...' : ''),
      type: 'video',
      url: job.output_url,
      thumbnail_url: job.thumbnail_url || job.output_url,
      starred: false,
      prompt: job.request.prompt,
      credits: 100,
      metadata: {
        resolution: job.request.resolution || '1080p',
        duration_sec: job.request.duration_seconds || 5,
        mime_type: 'video/mp4',
        file_size_bytes: 12000000,
        prompt_used: job.request.prompt,
        provider_id: job.provider,
        model_id: job.provider,
      },
    };

    try {
      await fetch(`${assetServiceUrl}/v1/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('[VideoService] registerAssetWithAssetService HTTP error:', err);
    }
  }
}
