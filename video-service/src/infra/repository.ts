import { VideoJob } from '../domain/types';

export interface VideoJobRepository {
  saveJob(job: VideoJob): Promise<VideoJob>;
  findJobById(id: string): Promise<VideoJob | null>;
  updateJob(id: string, update: Partial<VideoJob>): Promise<VideoJob>;
  listJobs(orgId?: string): Promise<VideoJob[]>;
}

/**
 * In-memory job repository for development.
 * In production, replace with a real database (Postgres, Redis, DynamoDB).
 * The interface contract stays the same — swap the implementation.
 */
export class InMemoryVideoJobRepository implements VideoJobRepository {
  private jobs: Map<string, VideoJob> = new Map();

  async saveJob(job: VideoJob): Promise<VideoJob> {
    this.jobs.set(job.id, job);
    return job;
  }

  async findJobById(id: string): Promise<VideoJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async updateJob(id: string, update: Partial<VideoJob>): Promise<VideoJob> {
    const existing = this.jobs.get(id);
    if (!existing) {
      throw new Error(`Job '${id}' not found`);
    }
    const updated: VideoJob = { ...existing, ...update, updated_at: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }

  async listJobs(orgId?: string): Promise<VideoJob[]> {
    const all = Array.from(this.jobs.values());
    if (!orgId) return all;
    return all.filter(j => j.request.org_id === orgId);
  }
}
