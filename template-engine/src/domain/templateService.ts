import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowTemplate,
  TemplateCategory,
  AppError
} from './types';
import { TemplateRepository } from '../infra/repository';
import { WorkflowEngineClient, ForkedWorkflowResult } from '../infra/workflowClient';

export interface CreateTemplateInput {
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  modalities: string[];
  thumbnail_url?: string;
  variables?: WorkflowTemplate['variables'];
  nodes: WorkflowTemplate['nodes'];
  edges: WorkflowTemplate['edges'];
  is_featured?: boolean;
}

export class TemplateService {
  constructor(
    private repo: TemplateRepository,
    private workflowClient: WorkflowEngineClient
  ) {}

  async seedStarterTemplates(): Promise<void> {
    const existing = await this.repo.findTemplates();
    if (existing.templates.length > 0) return;

    const now = new Date().toISOString();

    // 1. E-Commerce Product Ad Suite
    await this.repo.createTemplate({
      id: uuidv4(),
      slug: 'ecommerce-ad-suite',
      title: 'E-Commerce Product Ad Suite',
      description: 'Generates high-converting product photo prompt, renders via Dall-E 3, and upscales to 4K resolution.',
      category: 'ecommerce',
      modalities: ['text-to-image', 'upscale'],
      thumbnail_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      version: 1,
      is_featured: true,
      variables: [
        { name: 'product_name', label: 'Product Name', default_value: 'Luxury Wireless Headphones', required: true },
        { name: 'setting', label: 'Background Setting', default_value: 'Modern minimalist studio on marble pedestal', required: true },
      ],
      nodes: [
        { id: 'n1', name: 'Prompt Template', node_type: 'prompt', params: { text: 'Studio product photo of {{product_name}} in {{setting}}, studio lighting, 8k resolution' }, inputs: [], outputs: [{ name: 'text', type: 'string' }] },
        { id: 'n2', name: 'Dall-E 3 Render', node_type: 'generation', capability_type: 'text-to-image', params: { quality: 'hd' }, inputs: [{ name: 'prompt', type: 'string' }], outputs: [{ name: 'image', type: 'image' }] },
        { id: 'n3', name: '4K ESRGAN Upscaler', node_type: 'upscale', capability_type: 'upscale', params: { scale: 4 }, inputs: [{ name: 'image', type: 'image' }], outputs: [{ name: 'upscaled_image', type: 'image' }] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        { id: 'e2', source_node_id: 'n2', source_output: 'image', target_node_id: 'n3', target_input: 'image' },
      ],
      created_at: now,
      updated_at: now,
    });

    // 2. Social Video Production
    await this.repo.createTemplate({
      id: uuidv4(),
      slug: 'social-video-prod',
      title: 'Social Video Production',
      description: 'Creates dynamic promo video script, generates cinematic video with Sora, and overlays voiceover.',
      category: 'social_video',
      modalities: ['text-to-video', 'text-to-audio'],
      thumbnail_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=500',
      version: 1,
      is_featured: true,
      variables: [
        { name: 'brand_name', label: 'Brand Name', default_value: 'CyberTech Labs', required: true },
        { name: 'campaign_topic', label: 'Campaign Topic', default_value: 'Next-Gen AI Launch', required: true },
      ],
      nodes: [
        { id: 'n1', name: 'Script Generator', node_type: 'prompt', params: { text: 'Cinematic commercial teaser for {{brand_name}} featuring {{campaign_topic}}, hyperrealistic 3d render' }, inputs: [], outputs: [{ name: 'text', type: 'string' }] },
        { id: 'n2', name: 'Sora Video Gen', node_type: 'generation', capability_type: 'text-to-video', params: { duration_sec: 10, fps: 30 }, inputs: [{ name: 'prompt', type: 'string' }], outputs: [{ name: 'video', type: 'video' }] },
        { id: 'n3', name: 'ElevenLabs Voiceover', node_type: 'generation', capability_type: 'text-to-audio', params: { voice: 'alloy' }, inputs: [{ name: 'text', type: 'string' }], outputs: [{ name: 'audio', type: 'audio' }] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        { id: 'e2', source_node_id: 'n1', source_output: 'text', target_node_id: 'n3', target_input: 'text' },
      ],
      created_at: now,
      updated_at: now,
    });

    // 3. Multilingual Voiceover & Lipsync
    await this.repo.createTemplate({
      id: uuidv4(),
      slug: 'avatar-voiceover-sync',
      title: 'Multilingual Voiceover & Lipsync Avatar',
      description: 'Clones voiceover audio and syncs lips of realistic digital presenter avatar.',
      category: 'avatar',
      modalities: ['voice-clone', 'avatar-lipsync'],
      thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      version: 1,
      is_featured: false,
      variables: [
        { name: 'presenter_name', label: 'Presenter Name', default_value: 'Sarah AI', required: true },
      ],
      nodes: [
        { id: 'n1', name: 'ElevenLabs Voice Clone', node_type: 'generation', capability_type: 'voice-clone', params: { sample_rate: 44100 }, inputs: [], outputs: [{ name: 'audio', type: 'audio' }] },
        { id: 'n2', name: 'Lipsync Avatar Gen', node_type: 'generation', capability_type: 'avatar-lipsync', params: { presenter: '{{presenter_name}}' }, inputs: [{ name: 'audio', type: 'audio' }], outputs: [{ name: 'avatar_video', type: 'video' }] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'audio', target_node_id: 'n2', target_input: 'audio' },
      ],
      created_at: now,
      updated_at: now,
    });
  }

  async createTemplate(input: CreateTemplateInput): Promise<WorkflowTemplate> {
    if (!input.title || !input.slug) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: slug, title');
    }

    const existing = await this.repo.findTemplateBySlug(input.slug);
    if (existing) {
      throw new AppError(409, 'TEMPLATE_ALREADY_EXISTS', `Template with slug '${input.slug}' already exists`);
    }

    const now = new Date().toISOString();
    const template: WorkflowTemplate = {
      id: uuidv4(),
      slug: input.slug,
      title: input.title,
      description: input.description || '',
      category: input.category || 'marketing',
      modalities: input.modalities || ['text-to-image'],
      thumbnail_url: input.thumbnail_url,
      version: 1,
      variables: input.variables || [],
      nodes: input.nodes || [],
      edges: input.edges || [],
      is_featured: input.is_featured || false,
      created_at: now,
      updated_at: now,
    };

    return this.repo.createTemplate(template);
  }

  async getTemplate(id: string): Promise<WorkflowTemplate> {
    const template = await this.repo.findTemplateById(id);
    if (!template) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Template with id '${id}' not found`);
    }
    return template;
  }

  async listTemplates(options?: { category?: TemplateCategory; modality?: string; limit?: number; cursor?: string }): Promise<{ templates: WorkflowTemplate[]; next_cursor: string | null }> {
    return this.repo.findTemplates(options);
  }

  async forkTemplate(templateId: string, options?: { project_id?: string; custom_name?: string }): Promise<ForkedWorkflowResult> {
    const template = await this.getTemplate(templateId);

    const projectId = options?.project_id || 'proj-default';
    const workflowName = options?.custom_name || `${template.title} (Forked)`;

    return this.workflowClient.createWorkflow({
      project_id: projectId,
      name: workflowName,
      description: `Forked from template: ${template.title}`,
      nodes: template.nodes,
      edges: template.edges,
    });
  }
}
