import { MediaAsset, AssetType } from '../domain/types';

export interface AssetRepository {
  findAssets(options?: { type?: AssetType; project_id?: string }): Promise<MediaAsset[]>;
  findAssetById(id: string): Promise<MediaAsset | null>;
  createAsset(asset: MediaAsset): Promise<MediaAsset>;
}

export class InMemoryAssetRepository implements AssetRepository {
  private assets: Map<string, MediaAsset> = new Map();

  async findAssets(options?: { type?: AssetType; project_id?: string }): Promise<MediaAsset[]> {
    let list = Array.from(this.assets.values());
    if (options?.type) {
      list = list.filter((a) => a.type === options.type);
    }
    if (options?.project_id) {
      list = list.filter((a) => a.project_id === options.project_id);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async findAssetById(id: string): Promise<MediaAsset | null> {
    return this.assets.get(id) || null;
  }

  async createAsset(asset: MediaAsset): Promise<MediaAsset> {
    this.assets.set(asset.id, asset);
    return asset;
  }
}
