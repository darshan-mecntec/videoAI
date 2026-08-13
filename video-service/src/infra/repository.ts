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

import fs from 'fs';
import path from 'path';

export class JsonFileVideoJobRepository implements VideoJobRepository {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(__dirname, '../../data/jobs.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ jobs: {} }, null, 2), 'utf-8');
    }
  }

  private readData(): Record<string, VideoJob> {
    this.ensureFileExists();
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed.jobs || {};
    } catch {
      return {};
    }
  }

  private writeData(jobs: Record<string, VideoJob>): void {
    fs.writeFileSync(this.filePath, JSON.stringify({ jobs }, null, 2), 'utf-8');
  }

  async saveJob(job: VideoJob): Promise<VideoJob> {
    const data = this.readData();
    data[job.id] = job;
    this.writeData(data);
    return job;
  }

  async findJobById(id: string): Promise<VideoJob | null> {
    const data = this.readData();
    return data[id] || null;
  }

  async updateJob(id: string, update: Partial<VideoJob>): Promise<VideoJob> {
    const data = this.readData();
    if (!data[id]) {
      throw new Error(`Job '${id}' not found`);
    }
    data[id] = { ...data[id], ...update, updated_at: new Date().toISOString() };
    this.writeData(data);
    return data[id];
  }

  async listJobs(orgId?: string): Promise<VideoJob[]> {
    const data = this.readData();
    const all = Object.values(data);
    if (!orgId) return all;
    return all.filter(j => j.request.org_id === orgId);
  }
}
