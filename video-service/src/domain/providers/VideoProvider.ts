// ─────────────────────────────────────────────────────────────────────────────
// Video Provider SDK — Abstract Interface
// Every provider adapter MUST implement this contract exactly.
// The VideoService interacts only with this interface, never with provider SDKs directly.
// ─────────────────────────────────────────────────────────────────────────────

import {
  VideoGenerationRequest,
  VideoJob,
  ProviderCapabilityInfo,
  CostEstimate,
  VideoProviderName,
  VideoGenerationStage,
} from '../types';

export abstract class VideoProvider {
  abstract readonly id: VideoProviderName;
  abstract readonly displayName: string;

  /**
   * Returns true if the provider API key is set in env and the provider is usable.
   * A provider that returns false is skipped by the routing engine.
   */
  abstract isConfigured(): boolean;

  /**
   * Returns the capability manifest for this provider.
   * Used by the routing engine and the /v1/video/providers endpoint.
   */
  abstract getCapabilityInfo(): ProviderCapabilityInfo;

  /**
   * Submits a video generation job to the provider's real API.
   * Returns immediately with a VideoJob in 'queued' or 'processing' status.
   * The provider_job_id is the real job ID from the provider's API.
   */
  abstract submitJob(request: VideoGenerationRequest): Promise<VideoJob>;

  /**
   * Polls the real provider API for current job status.
   * Maps provider-specific status strings to our canonical VideoJobStatus enum.
   */
  abstract pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob>;

  /**
   * Sends a cancellation request to the provider.
   */
  abstract cancelJob(providerJobId: string): Promise<void>;

  /**
   * Returns a cost and latency estimate before submission.
   * Uses published provider pricing or empirical observations.
   */
  abstract estimateCost(request: VideoGenerationRequest): CostEstimate;

  /**
   * Returns true if the provider supports the requested generation stage.
   */
  abstract supportsStage(stage: VideoGenerationStage): boolean;

  /**
   * Performs a lightweight health check against the provider's API.
   * Used by the metrics-service heartbeat poller.
   */
  abstract healthCheck(): Promise<boolean>;
}
