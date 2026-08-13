import { WorkflowTemplate, TemplateCategory } from '../domain/types';

export interface TemplateRepository {
  findTemplates(options?: { category?: TemplateCategory; modality?: string; limit?: number; cursor?: string }): Promise<{ templates: WorkflowTemplate[]; next_cursor: string | null }>;
  findTemplateById(id: string): Promise<WorkflowTemplate | null>;
  findTemplateBySlug(slug: string): Promise<WorkflowTemplate | null>;
  createTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate>;
}

export class InMemoryTemplateRepository implements TemplateRepository {
  private templates: Map<string, WorkflowTemplate> = new Map();

  async findTemplates(options?: { category?: TemplateCategory; modality?: string; limit?: number; cursor?: string }): Promise<{ templates: WorkflowTemplate[]; next_cursor: string | null }> {
    let list = Array.from(this.templates.values());
    if (options?.category) {
      list = list.filter((t) => t.category === options.category);
    }
    if (options?.modality) {
      list = list.filter((t) => t.modalities.includes(options.modality!));
    }
    const limit = options?.limit || 20;
    let startIndex = 0;
    if (options?.cursor) {
      const idx = list.findIndex((t) => t.id === options.cursor);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }
    const sliced = list.slice(startIndex, startIndex + limit);
    const next_cursor = startIndex + limit < list.length && sliced.length > 0 ? sliced[sliced.length - 1].id : null;
    return { templates: sliced, next_cursor };
  }

  async findTemplateById(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async findTemplateBySlug(slug: string): Promise<WorkflowTemplate | null> {
    for (const template of this.templates.values()) {
      if (template.slug === slug) return template;
    }
    return null;
  }

  async createTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    this.templates.set(template.id, template);
    return template;
  }
}
