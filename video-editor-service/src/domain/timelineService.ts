import {
  TimelineProject,
  EditOperation,
  VideoClip,
  AudioClip,
  SubtitleClip,
  OverlayClip,
  EffectItem,
  AppError,
  AspectRatio,
} from './types';
import { EditorRepository } from '../infra/repository';
import { v4 as uuidv4 } from 'uuid';

export class TimelineService {
  constructor(private repo: EditorRepository) {}

  async createTimeline(params: {
    name: string;
    project_id?: string;
    aspect_ratio?: AspectRatio;
    resolution?: '720p' | '1080p' | '4k';
  }): Promise<TimelineProject> {
    const now = new Date().toISOString();
    const timeline: TimelineProject = {
      id: `tl-${uuidv4()}`,
      project_id: params.project_id,
      name: params.name || 'Untitled Video Project',
      duration_ms: 0,
      aspect_ratio: params.aspect_ratio || '16:9',
      resolution: params.resolution || '1080p',
      tracks: {
        video: [],
        audio: [],
        subtitles: [],
        overlays: [],
        effects: [],
      },
      created_at: now,
      updated_at: now,
    };
    return this.repo.createTimeline(timeline);
  }

  async getTimeline(id: string): Promise<TimelineProject> {
    const timeline = await this.repo.findTimelineById(id);
    if (!timeline) {
      throw new AppError(404, 'TIMELINE_NOT_FOUND', `Timeline project '${id}' not found.`);
    }
    return timeline;
  }

  async applyEditOperation(id: string, op: EditOperation): Promise<TimelineProject> {
    const timeline = await this.getTimeline(id);
    const tracks = { ...timeline.tracks };

    switch (op.type) {
      case 'add_clip': {
        const payload = op.payload as {
          asset_url: string;
          start_ms?: number;
          duration_ms?: number;
          trim_start_ms?: number;
          trim_end_ms?: number;
        };
        if (!payload.asset_url) {
          throw new AppError(400, 'INVALID_INPUT', 'asset_url is required to add a clip.');
        }

        const startMs = payload.start_ms ?? this.calculateEndMs(tracks.video);
        const durationMs = payload.duration_ms ?? 5000;
        const clip: VideoClip = {
          id: `clip-${uuidv4()}`,
          asset_url: payload.asset_url,
          start_ms: startMs,
          end_ms: startMs + durationMs,
          trim_start_ms: payload.trim_start_ms ?? 0,
          trim_end_ms: payload.trim_end_ms ?? durationMs,
          speed: 1.0,
          volume: 1.0,
          opacity: 1.0,
        };
        tracks.video.push(clip);
        break;
      }

      case 'remove_clip': {
        if (!op.clip_id) throw new AppError(400, 'INVALID_INPUT', 'clip_id required for remove_clip.');
        tracks.video = tracks.video.filter(c => c.id !== op.clip_id);
        break;
      }

      case 'trim_clip': {
        if (!op.clip_id) throw new AppError(400, 'INVALID_INPUT', 'clip_id required for trim_clip.');
        const target = tracks.video.find(c => c.id === op.clip_id);
        if (!target) throw new AppError(404, 'CLIP_NOT_FOUND', `Clip '${op.clip_id}' not found.`);
        const payload = op.payload as { trim_start_ms?: number; trim_end_ms?: number };
        if (payload.trim_start_ms !== undefined) target.trim_start_ms = payload.trim_start_ms;
        if (payload.trim_end_ms !== undefined) target.trim_end_ms = payload.trim_end_ms;
        target.end_ms = target.start_ms + (target.trim_end_ms - target.trim_start_ms);
        break;
      }

      case 'set_clip_speed': {
        if (!op.clip_id) throw new AppError(400, 'INVALID_INPUT', 'clip_id required for set_clip_speed.');
        const target = tracks.video.find(c => c.id === op.clip_id);
        if (!target) throw new AppError(404, 'CLIP_NOT_FOUND', `Clip '${op.clip_id}' not found.`);
        const speed = (op.payload as { speed?: number }).speed ?? 1.0;
        target.speed = speed;
        break;
      }

      case 'set_clip_volume': {
        if (!op.clip_id) throw new AppError(400, 'INVALID_INPUT', 'clip_id required for set_clip_volume.');
        const target = tracks.video.find(c => c.id === op.clip_id);
        if (!target) throw new AppError(404, 'CLIP_NOT_FOUND', `Clip '${op.clip_id}' not found.`);
        target.volume = (op.payload as { volume?: number }).volume ?? 1.0;
        break;
      }

      case 'add_subtitle': {
        const payload = op.payload as { text: string; start_ms: number; duration_ms: number; font_size?: number; font_color?: string };
        if (!payload.text) throw new AppError(400, 'INVALID_INPUT', 'text is required to add subtitle.');
        const sub: SubtitleClip = {
          id: `sub-${uuidv4()}`,
          text: payload.text,
          start_ms: payload.start_ms || 0,
          end_ms: (payload.start_ms || 0) + (payload.duration_ms || 3000),
          font_size: payload.font_size || 24,
          font_color: payload.font_color || '#FFFFFF',
          position: 'bottom',
        };
        tracks.subtitles.push(sub);
        break;
      }

      case 'add_overlay': {
        const payload = op.payload as { asset_url: string; start_ms?: number; duration_ms?: number; x_pct?: number; y_pct?: number; width_pct?: number };
        if (!payload.asset_url) throw new AppError(400, 'INVALID_INPUT', 'asset_url is required for overlay.');
        const overlay: OverlayClip = {
          id: `overlay-${uuidv4()}`,
          asset_url: payload.asset_url,
          start_ms: payload.start_ms || 0,
          end_ms: (payload.start_ms || 0) + (payload.duration_ms || 5000),
          x_pct: payload.x_pct ?? 5,
          y_pct: payload.y_pct ?? 5,
          width_pct: payload.width_pct ?? 15,
          opacity: 0.9,
        };
        tracks.overlays.push(overlay);
        break;
      }

      case 'change_aspect_ratio': {
        const ar = (op.payload as { aspect_ratio?: AspectRatio }).aspect_ratio;
        if (ar) timeline.aspect_ratio = ar;
        break;
      }

      default:
        throw new AppError(400, 'UNKNOWN_EDIT_OPERATION', `Edit operation '${op.type}' is not supported.`);
    }

    timeline.tracks = tracks;
    timeline.duration_ms = this.calculateTotalDuration(tracks);
    return this.repo.updateTimeline(id, timeline);
  }

  async listTimelines(projectId?: string): Promise<TimelineProject[]> {
    return this.repo.listTimelines(projectId);
  }

  private calculateEndMs(clips: VideoClip[]): number {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(c => c.end_ms));
  }

  private calculateTotalDuration(tracks: TimelineProject['tracks']): number {
    const videoEnd = tracks.video.length > 0 ? Math.max(...tracks.video.map((c: VideoClip) => c.end_ms)) : 0;
    const audioEnd = tracks.audio.length > 0 ? Math.max(...tracks.audio.map((c: AudioClip) => c.end_ms)) : 0;
    return Math.max(videoEnd, audioEnd);
  }
}
