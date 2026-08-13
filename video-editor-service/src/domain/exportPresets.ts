import { ExportPresetName, ExportPresetConfig } from './types';

export const EXPORT_PRESETS: Record<ExportPresetName, ExportPresetConfig> = {
  youtube_1080p: {
    name: 'youtube_1080p',
    display_name: 'YouTube HD (1080p, 16:9)',
    aspect_ratio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    video_bitrate: '8000k',
    format: 'mp4',
  },
  instagram_reel: {
    name: 'instagram_reel',
    display_name: 'Instagram Reel (1080x1920, 9:16)',
    aspect_ratio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    video_bitrate: '5000k',
    format: 'mp4',
  },
  tiktok: {
    name: 'tiktok',
    display_name: 'TikTok Video (1080x1920, 9:16)',
    aspect_ratio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    video_bitrate: '5000k',
    format: 'mp4',
  },
  facebook_square: {
    name: 'facebook_square',
    display_name: 'Facebook Square (1080x1080, 1:1)',
    aspect_ratio: '1:1',
    width: 1080,
    height: 1080,
    fps: 30,
    video_bitrate: '4000k',
    format: 'mp4',
  },
  linkedin_hd: {
    name: 'linkedin_hd',
    display_name: 'LinkedIn Video (1920x1080, 16:9)',
    aspect_ratio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    video_bitrate: '6000k',
    format: 'mp4',
  },
  animated_gif: {
    name: 'animated_gif',
    display_name: 'Animated GIF (480x270)',
    aspect_ratio: '16:9',
    width: 480,
    height: 270,
    fps: 15,
    video_bitrate: '1000k',
    format: 'gif',
  },
};

export function getExportPreset(name: ExportPresetName): ExportPresetConfig {
  const preset = EXPORT_PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown export preset '${name}'`);
  }
  return preset;
}

export function listExportPresets(): ExportPresetConfig[] {
  return Object.values(EXPORT_PRESETS);
}
