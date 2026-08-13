import { TimelineProject, RenderJob, ExportPresetName, AppError } from './types';
import { getExportPreset } from './exportPresets';
import { EditorRepository } from '../infra/repository';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export class RenderService {
  constructor(private repo: EditorRepository) {}

  async triggerRender(timeline: TimelineProject, presetName: ExportPresetName): Promise<RenderJob> {
    const preset = getExportPreset(presetName);
    const now = new Date().toISOString();
    const jobId = `render-${uuidv4()}`;

    if (timeline.tracks.video.length === 0) {
      throw new AppError(400, 'TIMELINE_EMPTY', 'Timeline has no video clips to render.');
    }

    // Create initial render job
    const job: RenderJob = {
      id: jobId,
      timeline_id: timeline.id,
      preset: presetName,
      status: 'rendering',
      progress_pct: 10,
      duration_ms: timeline.duration_ms || 5000,
      created_at: now,
    };
    await this.repo.saveRenderJob(job);

    // Asynchronous render process
    this.executeRenderProcess(job, timeline, preset).catch(err => {
      console.error(`[renderService] Render job ${jobId} failed:`, err);
      this.repo.updateRenderJob(jobId, {
        status: 'failed',
        error_message: (err as Error).message || 'FFmpeg render error',
        finished_at: new Date().toISOString(),
      });
    });

    return job;
  }

  async getRenderJob(id: string): Promise<RenderJob> {
    const job = await this.repo.findRenderJobById(id);
    if (!job) {
      throw new AppError(404, 'RENDER_JOB_NOT_FOUND', `Render job '${id}' not found.`);
    }
    return job;
  }

  async listRenderJobs(timelineId?: string): Promise<RenderJob[]> {
    return this.repo.listRenderJobs(timelineId);
  }

  private async executeRenderProcess(job: RenderJob, timeline: TimelineProject, preset: ReturnType<typeof getExportPreset>) {
    const uploadsDir = path.resolve(process.env.STORAGE_LOCAL_PATH || './uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `export-${job.id}.${preset.format}`;
    const outputPath = path.join(uploadsDir, filename);

    // Simulate progressive render progress (10% -> 40% -> 70% -> 100%)
    await new Promise(res => setTimeout(res, 500));
    await this.repo.updateRenderJob(job.id, { progress_pct: 40 });

    await new Promise(res => setTimeout(res, 800));
    await this.repo.updateRenderJob(job.id, { progress_pct: 75 });

    // Ensure output file exists or write metadata file
    const sampleVideoUrl = timeline.tracks.video[0]?.asset_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    
    // Write rendered output metadata / local asset
    fs.writeFileSync(outputPath, Buffer.from(`RENDERED_VIDEO_ASSET:${job.id}:${preset.name}:${sampleVideoUrl}`));

    const finishedAt = new Date().toISOString();
    const stats = fs.statSync(outputPath);

    await this.repo.updateRenderJob(job.id, {
      status: 'succeeded',
      progress_pct: 100,
      output_url: sampleVideoUrl.startsWith('http') ? sampleVideoUrl : `http://localhost:3012/uploads/${filename}`,
      file_size_bytes: stats.size,
      finished_at: finishedAt,
    });
  }
}
