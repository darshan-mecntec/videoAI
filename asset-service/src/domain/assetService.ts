import { v4 as uuidv4 } from 'uuid';
import { MediaAsset, CreateAssetInput, AssetType, AppError } from './types';
import { AssetRepository } from '../infra/repository';

export class AssetService {
  constructor(private repo: AssetRepository) {}

  async seedStarterAssets(): Promise<void> {
    const existing = await this.repo.findAssets();
    if (existing.length > 0) return;

    const now = new Date().toISOString();

    // Starter Sample Generated Assets
    const starterAssets: MediaAsset[] = [
      {
        id: 'asset-video-demo-1',
        project_id: 'proj-default',
        user_id: 'usr-1c94e86b',
        org_id: 'org-main-1',
        name: 'CyberTech AI Commercial Teaser',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=500',
        starred: true,
        prompt: 'Cinematic commercial teaser for CyberTech AI, hyperrealistic 3d render',
        credits: 100,
        metadata: {
          resolution: '1920x1080',
          duration_sec: 15,
          fps: 30,
          mime_type: 'video/mp4',
          file_size_bytes: 15420000,
          prompt_used: 'Cinematic commercial teaser for CyberTech AI, hyperrealistic 3d render',
          provider_id: 'provider-runway-gen2',
          model_id: 'gen-2',
        },
        created_at: now,
      },
      {
        id: 'asset-image-demo-1',
        project_id: 'proj-default',
        user_id: 'usr-1c94e86b',
        org_id: 'org-main-1',
        name: 'Luxury Wireless Headphones 4K',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200',
        thumbnail_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        starred: false,
        prompt: 'Studio product photo of Luxury Wireless Headphones on marble pedestal, 8k',
        credits: 15,
        metadata: {
          resolution: '3840x2160',
          mime_type: 'image/png',
          file_size_bytes: 4200000,
          prompt_used: 'Studio product photo of Luxury Wireless Headphones on marble pedestal, 8k',
          provider_id: 'provider-openai-dalle3',
          model_id: 'dall-e-3',
        },
        created_at: now,
      },
    ];

    for (const asset of starterAssets) {
      await this.repo.createAsset(asset);
    }
  }

  async listAssets(options?: { type?: AssetType; project_id?: string; user_id?: string; org_id?: string; starred?: boolean }): Promise<MediaAsset[]> {
    return this.repo.findAssets(options);
  }

  async getAssetById(id: string): Promise<MediaAsset> {
    const asset = await this.repo.findAssetById(id);
    if (!asset) {
      throw new AppError(404, 'ASSET_NOT_FOUND', `Asset with id '${id}' not found`);
    }
    return asset;
  }

  async createAsset(input: CreateAssetInput): Promise<MediaAsset> {
    if (!input.name || !input.url || !input.type) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: name, type, url');
    }

    const asset: MediaAsset = {
      id: uuidv4(),
      project_id: input.project_id || 'proj-default',
      user_id: input.user_id,
      org_id: input.org_id,
      name: input.name,
      type: input.type,
      url: input.url,
      thumbnail_url: input.thumbnail_url || input.url,
      starred: input.starred || false,
      prompt: input.prompt || input.metadata?.prompt_used || '',
      credits: input.credits || 15,
      metadata: input.metadata || { mime_type: 'application/octet-stream', file_size_bytes: 0 },
      created_at: new Date().toISOString(),
    };

    return this.repo.createAsset(asset);
  }

  async updateAsset(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset> {
    await this.getAssetById(id); // Throws 404 if not found
    return this.repo.updateAsset(id, patch);
  }

  async deleteAsset(id: string): Promise<boolean> {
    await this.getAssetById(id); // Throws 404 if not found
    return this.repo.deleteAsset(id);
  }

  async uploadAsset(filename: string, fileData: string, type: AssetType, user_id?: string, org_id?: string): Promise<MediaAsset> {
    if (!filename || !fileData) {
      throw new AppError(400, 'INVALID_INPUT', 'Filename and fileData are required for upload');
    }

    const isVideo = type === 'video' || filename.endsWith('.mp4');
    const isImage = type === 'image' || filename.endsWith('.png') || filename.endsWith('.jpg');

    const asset: MediaAsset = {
      id: `asset-${uuidv4().substring(0, 8)}`,
      project_id: 'proj-default',
      user_id,
      org_id,
      name: filename,
      type: isVideo ? 'video' : isImage ? 'image' : 'audio',
      url: fileData.startsWith('data:') ? fileData : `data:image/png;base64,${fileData}`,
      thumbnail_url: fileData.startsWith('data:') ? fileData : `data:image/png;base64,${fileData}`,
      starred: false,
      prompt: 'Uploaded file',
      credits: 0,
      metadata: {
        file_size_bytes: fileData.length,
        mime_type: isVideo ? 'video/mp4' : 'image/png',
      },
      created_at: new Date().toISOString(),
    };

    return this.repo.createAsset(asset);
  }
}
