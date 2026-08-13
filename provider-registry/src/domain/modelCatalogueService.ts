import { ModelCatalogueEntry, AppError } from './types';
import { PostgresModelCatalogueStore, globalModelCatalogueStore } from '../infra/postgresModelCatalogueStore';
import { v4 as uuidv4 } from 'uuid';

export class ModelCatalogueService {
  constructor(private store: PostgresModelCatalogueStore = globalModelCatalogueStore) {}

  public async getEnabledModels(modality?: string): Promise<ModelCatalogueEntry[]> {
    return this.store.listEnabledModels(modality);
  }

  public async getAllModels(): Promise<ModelCatalogueEntry[]> {
    return this.store.listAllModels();
  }

  public async addModel(input: Partial<ModelCatalogueEntry>): Promise<ModelCatalogueEntry> {
    if (!input.display_name || !input.provider_slug || !input.provider_model_id || !input.modality) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: display_name, provider_slug, provider_model_id, modality');
    }

    const now = new Date().toISOString();
    const id = input.id || `mod-${uuidv4().substring(0, 8)}`;

    const entry: ModelCatalogueEntry = {
      id,
      display_name: input.display_name,
      provider_slug: input.provider_slug,
      provider_model_id: input.provider_model_id,
      modality: input.modality as any,
      quality_tier: input.quality_tier || 'standard',
      credits_per_unit: Number(input.credits_per_unit) || 5,
      unit: input.unit || 'per-image',
      provider_cost_usd: Number(input.provider_cost_usd) || 0.05,
      description: input.description || '',
      is_enabled: input.is_enabled ?? true,
      is_featured: input.is_featured ?? false,
      sort_order: Number(input.sort_order) || 10,
      created_at: now,
      updated_at: now,
    };

    return this.store.saveModel(entry);
  }

  public async updateModel(id: string, updates: Partial<ModelCatalogueEntry>): Promise<ModelCatalogueEntry> {
    const all = await this.store.listAllModels();
    const existing = all.find(m => m.id === id);
    if (!existing) {
      throw new AppError(404, 'MODEL_NOT_FOUND', `Model with ID '${id}' not found`);
    }

    const updated: ModelCatalogueEntry = {
      ...existing,
      ...updates,
      id: existing.id,
      updated_at: new Date().toISOString(),
    };

    return this.store.saveModel(updated);
  }

  public async toggleModelStatus(id: string): Promise<ModelCatalogueEntry> {
    const all = await this.store.listAllModels();
    const existing = all.find(m => m.id === id);
    if (!existing) {
      throw new AppError(404, 'MODEL_NOT_FOUND', `Model with ID '${id}' not found`);
    }

    return this.updateModel(id, { is_enabled: !existing.is_enabled });
  }

  public async deleteModel(id: string): Promise<boolean> {
    return this.store.deleteModel(id);
  }
}

export const globalModelCatalogueService = new ModelCatalogueService();
