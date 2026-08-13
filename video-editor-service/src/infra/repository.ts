import { TimelineProject, RenderJob } from '../domain/types';

export interface EditorRepository {
  createTimeline(timeline: TimelineProject): Promise<TimelineProject>;
  findTimelineById(id: string): Promise<TimelineProject | null>;
  updateTimeline(id: string, update: Partial<TimelineProject>): Promise<TimelineProject>;
  listTimelines(projectId?: string): Promise<TimelineProject[]>;

  saveRenderJob(job: RenderJob): Promise<RenderJob>;
  findRenderJobById(id: string): Promise<RenderJob | null>;
  updateRenderJob(id: string, update: Partial<RenderJob>): Promise<RenderJob>;
  listRenderJobs(timelineId?: string): Promise<RenderJob[]>;
}

export class InMemoryEditorRepository implements EditorRepository {
  private timelines: Map<string, TimelineProject> = new Map();
  private renderJobs: Map<string, RenderJob> = new Map();

  async createTimeline(timeline: TimelineProject): Promise<TimelineProject> {
    this.timelines.set(timeline.id, timeline);
    return timeline;
  }

  async findTimelineById(id: string): Promise<TimelineProject | null> {
    return this.timelines.get(id) ?? null;
  }

  async updateTimeline(id: string, update: Partial<TimelineProject>): Promise<TimelineProject> {
    const existing = this.timelines.get(id);
    if (!existing) {
      throw new Error(`Timeline '${id}' not found`);
    }
    const updated: TimelineProject = {
      ...existing,
      ...update,
      updated_at: new Date().toISOString(),
    };
    this.timelines.set(id, updated);
    return updated;
  }

  async listTimelines(projectId?: string): Promise<TimelineProject[]> {
    const all = Array.from(this.timelines.values());
    if (!projectId) return all;
    return all.filter(t => t.project_id === projectId);
  }

  async saveRenderJob(job: RenderJob): Promise<RenderJob> {
    this.renderJobs.set(job.id, job);
    return job;
  }

  async findRenderJobById(id: string): Promise<RenderJob | null> {
    return this.renderJobs.get(id) ?? null;
  }

  async updateRenderJob(id: string, update: Partial<RenderJob>): Promise<RenderJob> {
    const existing = this.renderJobs.get(id);
    if (!existing) {
      throw new Error(`Render job '${id}' not found`);
    }
    const updated: RenderJob = { ...existing, ...update };
    this.renderJobs.set(id, updated);
    return updated;
  }

  async listRenderJobs(timelineId?: string): Promise<RenderJob[]> {
    const all = Array.from(this.renderJobs.values());
    if (!timelineId) return all;
    return all.filter(j => j.timeline_id === timelineId);
  }
}
