import { VideoGenerationRequest, VideoJob, AppError, VideoProviderName } from './types';
import { ProviderRegistry } from './providerRegistry';
import { VideoJobRepository } from '../infra/repository';

export class VideoService {
  constructor(
    private registry: ProviderRegistry,
    private repo: VideoJobRepository
  ) {}

  /**
   * Validates the request, selects provider via registry, submits real job to provider API.
   */
  async submitGenerationJob(request: VideoGenerationRequest): Promise<VideoJob> {
    this.validateRequest(request);

    const provider = await this.registry.resolveProvider(request);
    const job = await provider.submitJob(request);
    return this.repo.saveJob(job);
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
    return this.repo.updateJob(jobId, updated);
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
}
