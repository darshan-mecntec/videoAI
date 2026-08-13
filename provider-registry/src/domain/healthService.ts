import { HealthRecord, HealthStatusType, AppError } from './types';
import { ProviderRepository, CacheService } from '../infra/repository';
import { v4 as uuidv4 } from 'uuid';

export class HealthService {
  constructor(
    private repo: ProviderRepository,
    private cache: CacheService
  ) {}

  async getHealth(providerId: string): Promise<HealthRecord> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }

    const record = await this.repo.findHealthRecordByProviderId(providerId);
    if (!record) {
      // Default initial record
      return {
        id: uuidv4(),
        provider_id: providerId,
        checked_at: new Date().toISOString(),
        latency_ms: 0,
        status: 'healthy',
        error_message: null,
        availability_7d: 1.0,
      };
    }

    return record;
  }

  async getHealthSummary(): Promise<HealthRecord[]> {
    return this.repo.findLatestHealthSummary();
  }

  async recordHealthCheck(
    providerId: string,
    status: HealthStatusType,
    latencyMs: number,
    errorMessage: string | null = null,
    availability7d: number = 1.0
  ): Promise<HealthRecord> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }

    const record = await this.repo.createHealthRecord({
      id: uuidv4(),
      provider_id: providerId,
      checked_at: new Date().toISOString(),
      latency_ms: latencyMs,
      status,
      error_message: errorMessage,
      availability_7d: availability7d,
    });

    await this.cache.set(`provider:${providerId}:health`, record, 60);

    return record;
  }
}
