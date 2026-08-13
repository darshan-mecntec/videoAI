import fs from 'fs';
import path from 'path';
import { MediaAsset, AssetType } from '../domain/types';

export interface AssetRepository {
  findAssets(options?: { type?: AssetType; project_id?: string; user_id?: string; org_id?: string; starred?: boolean }): Promise<MediaAsset[]>;
  findAssetById(id: string): Promise<MediaAsset | null>;
  createAsset(asset: MediaAsset): Promise<MediaAsset>;
  updateAsset(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset>;
  deleteAsset(id: string): Promise<boolean>;
}

export class InMemoryAssetRepository implements AssetRepository {
  private assets: Map<string, MediaAsset> = new Map();

  async findAssets(options?: { type?: AssetType; project_id?: string; user_id?: string; org_id?: string; starred?: boolean }): Promise<MediaAsset[]> {
    let list = Array.from(this.assets.values());
    if (options?.type) {
      list = list.filter((a) => a.type === options.type);
    }
    if (options?.project_id) {
      list = list.filter((a) => a.project_id === options.project_id);
    }
    if (options?.user_id) {
      list = list.filter((a) => a.user_id === options.user_id);
    }
    if (options?.org_id) {
      list = list.filter((a) => a.org_id === options.org_id);
    }
    if (options?.starred !== undefined) {
      list = list.filter((a) => Boolean(a.starred) === options.starred);
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

  async updateAsset(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset> {
    const existing = this.assets.get(id);
    if (!existing) {
      throw new Error(`Asset '${id}' not found`);
    }
    const updated = { ...existing, ...patch };
    this.assets.set(id, updated);
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }
}

export class JsonFileAssetRepository implements AssetRepository {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(__dirname, '../../data/assets.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ assets: {} }, null, 2), 'utf-8');
    }
  }

  private readData(): Record<string, MediaAsset> {
    this.ensureFileExists();
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed.assets || {};
    } catch {
      return {};
    }
  }

  private writeData(assets: Record<string, MediaAsset>): void {
    fs.writeFileSync(this.filePath, JSON.stringify({ assets }, null, 2), 'utf-8');
  }

  async findAssets(options?: { type?: AssetType; project_id?: string; user_id?: string; org_id?: string; starred?: boolean }): Promise<MediaAsset[]> {
    const data = this.readData();
    let list = Object.values(data);

    if (options?.type) {
      list = list.filter((a) => a.type === options.type);
    }
    if (options?.project_id) {
      list = list.filter((a) => a.project_id === options.project_id);
    }
    if (options?.user_id) {
      list = list.filter((a) => a.user_id === options.user_id);
    }
    if (options?.org_id) {
      list = list.filter((a) => a.org_id === options.org_id);
    }
    if (options?.starred !== undefined) {
      list = list.filter((a) => Boolean(a.starred) === options.starred);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async findAssetById(id: string): Promise<MediaAsset | null> {
    const data = this.readData();
    return data[id] || null;
  }

  async createAsset(asset: MediaAsset): Promise<MediaAsset> {
    const data = this.readData();
    data[asset.id] = asset;
    this.writeData(data);
    return asset;
  }

  async updateAsset(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset> {
    const data = this.readData();
    if (!data[id]) {
      throw new Error(`Asset '${id}' not found`);
    }
    data[id] = { ...data[id], ...patch };
    this.writeData(data);
    return data[id];
  }

  async deleteAsset(id: string): Promise<boolean> {
    const data = this.readData();
    if (!data[id]) return false;
    delete data[id];
    this.writeData(data);
    return true;
  }
}
