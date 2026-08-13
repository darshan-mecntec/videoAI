import { VideoGenerationRequest, AppError } from './types';
import { VideoJobRepository } from '../infra/repository';

export interface UserAuthContext {
  userId: string;
  orgId: string;
  role: 'super_admin' | 'org_admin' | 'editor' | 'member' | 'viewer';
}

const PREMIUM_MODELS = ['google_veo', 'openai', 'sora-2', 'veo-3-1'];

export class AbacPolicyEngine {
  constructor(private repo: VideoJobRepository) {}

  /**
   * Enforces ABAC model tier, resolution, duration, and concurrency rules.
   */
  async enforceGenerationPolicy(request: VideoGenerationRequest, authContext: UserAuthContext): Promise<void> {
    const { role, userId, orgId } = authContext;

    // 1. Viewer Role — Read Only Access
    if (role === 'viewer') {
      throw new AppError(
        403,
        'ROLE_FORBIDDEN',
        `User role 'viewer' does not have permission to submit video generation jobs. Upgrade to 'editor' or 'member' role.`
      );
    }

    // 2. Member Role Restrictions
    if (role === 'member') {
      if (request.preferred_provider && PREMIUM_MODELS.includes(request.preferred_provider)) {
        throw new AppError(
          403,
          'MODEL_TIER_RESTRICTED',
          `Model '${request.preferred_provider}' is restricted to 'editor' or 'org_admin' roles. Upgrade your role to access 4K Veo 3.1 & Sora 2.`
        );
      }

      if (request.resolution === '1080p') {
        throw new AppError(
          403,
          'RESOLUTION_RESTRICTED',
          `1080p resolution is restricted to 'editor' role and above. Standard 'member' role is limited to 720p.`
        );
      }

      if (request.duration_seconds && request.duration_seconds > 5) {
        throw new AppError(
          403,
          'DURATION_RESTRICTED',
          `Video duration > 5s is restricted to 'editor' role and above.`
        );
      }
    }

    // 3. Concurrency Limits Per Role
    const roleMaxConcurrency: Record<string, number> = {
      member: 2,
      editor: 4,
      org_admin: 10,
      super_admin: 25,
    };

    const maxAllowed = roleMaxConcurrency[role] || 2;

    // Query active jobs (queued or processing) for this user
    const userActiveJobs = await this.getUserActiveJobCount(userId, orgId);
    if (userActiveJobs >= maxAllowed) {
      throw new AppError(
        429,
        'CONCURRENCY_LIMIT_EXCEEDED',
        `User '${userId}' has reached the maximum allowed concurrent jobs limit (${maxAllowed} active jobs). Please wait for active renders to complete.`
      );
    }
  }

  private async getUserActiveJobCount(userId: string, orgId?: string): Promise<number> {
    try {
      const jobs = await this.repo.listJobs(orgId);
      return jobs.filter(j => j.request.user_id === userId && (j.status === 'queued' || j.status === 'initializing' || j.status === 'processing')).length;
    } catch {
      return 0;
    }
  }
}
