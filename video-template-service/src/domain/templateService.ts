import {
  VideoTemplate,
  TemplateCategory,
  TemplateSubmissionRequest,
  TemplateSubmissionResult,
  AppError,
} from './types';
import { TemplateRepository } from '../infra/repository';
import { v4 as uuidv4 } from 'uuid';

export class TemplateService {
  constructor(private repo: TemplateRepository) {}

  async listTemplates(category?: TemplateCategory): Promise<VideoTemplate[]> {
    return this.repo.listTemplates(category);
  }

  async getTemplate(id: string): Promise<VideoTemplate> {
    const template = await this.repo.findTemplateById(id);
    if (!template) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Video template '${id}' not found.`);
    }
    return template;
  }

  async createCustomTemplate(data: Omit<VideoTemplate, 'id' | 'is_system' | 'created_at' | 'updated_at'>): Promise<VideoTemplate> {
    if (!data.name || !data.category || !data.fields || data.fields.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Template name, category, and at least one field are required.');
    }

    const now = new Date().toISOString();
    const template: VideoTemplate = {
      ...data,
      id: `tmpl-custom-${uuidv4()}`,
      is_system: false,
      created_at: now,
      updated_at: now,
    };
    return this.repo.createTemplate(template);
  }

  async submitTemplateForm(submission: TemplateSubmissionRequest): Promise<TemplateSubmissionResult> {
    const template = await this.getTemplate(submission.template_id);
    const fieldValues = submission.field_values || {};

    // Validate required fields
    for (const field of template.fields) {
      if (field.required && (fieldValues[field.key] === undefined || fieldValues[field.key] === '')) {
        throw new AppError(400, 'MISSING_REQUIRED_FIELD', `Field '${field.label}' (${field.key}) is required.`);
      }
    }

    // Construct generation request for video-service (:3011)
    const promptParts: string[] = [];
    let primaryImageUrl: string | undefined;
    let imageArray: string[] | undefined;

    template.fields.forEach(f => {
      const val = fieldValues[f.key];
      if (!val) return;

      if (f.type === 'image' && typeof val === 'string') {
        primaryImageUrl = val;
      } else if (f.type === 'images') {
        if (Array.isArray(val)) imageArray = val.map(String);
        else if (typeof val === 'string') imageArray = val.split('\n').map(s => s.trim()).filter(Boolean);
      } else {
        promptParts.push(`${f.label}: ${val}`);
      }
    });

    const constructedPrompt = `${template.name}. ${promptParts.join('. ')}`;
    const videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://localhost:3011';

    const generatePayload: Record<string, unknown> = {
      stage: template.generation_config.stage,
      prompt: constructedPrompt,
      aspect_ratio: template.generation_config.aspect_ratio || '16:9',
      duration_seconds: template.generation_config.duration_seconds || 5,
      resolution: template.generation_config.resolution || '1080p',
      project_id: submission.project_id,
      org_id: submission.org_id,
    };

    if (primaryImageUrl) generatePayload.image_url = primaryImageUrl;
    if (imageArray && imageArray.length > 0) {
      generatePayload.image_urls = imageArray;
      if (!primaryImageUrl) generatePayload.image_url = imageArray[0];
    }
    if (template.generation_config.preferred_provider) {
      generatePayload.preferred_provider = template.generation_config.preferred_provider;
    }

    // Submit to real video-service
    try {
      const response = await fetch(`${videoServiceUrl}/v1/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatePayload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new AppError(
          response.status,
          'VIDEO_GENERATION_FAILED',
          errBody.error?.message || `video-service returned HTTP ${response.status}`
        );
      }

      const resData = await response.json() as { job: { id: string; provider: string; status: string } };

      return {
        job_id: resData.job.id,
        provider: resData.job.provider,
        status: resData.job.status,
        template,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, 'VIDEO_SERVICE_UNAVAILABLE', `Could not reach video-service at ${videoServiceUrl}: ${(err as Error).message}`);
    }
  }
}
