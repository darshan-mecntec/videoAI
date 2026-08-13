import { VideoTemplate, TemplateCategory } from '../domain/types';

export interface TemplateRepository {
  createTemplate(template: VideoTemplate): Promise<VideoTemplate>;
  findTemplateById(id: string): Promise<VideoTemplate | null>;
  updateTemplate(id: string, update: Partial<VideoTemplate>): Promise<VideoTemplate>;
  deleteTemplate(id: string): Promise<boolean>;
  listTemplates(category?: TemplateCategory): Promise<VideoTemplate[]>;
}

export class InMemoryTemplateRepository implements TemplateRepository {
  private templates: Map<string, VideoTemplate> = new Map();

  constructor() {
    this.seedSystemTemplates();
  }

  async createTemplate(template: VideoTemplate): Promise<VideoTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async findTemplateById(id: string): Promise<VideoTemplate | null> {
    return this.templates.get(id) ?? null;
  }

  async updateTemplate(id: string, update: Partial<VideoTemplate>): Promise<VideoTemplate> {
    const existing = this.templates.get(id);
    if (!existing) throw new Error(`Template '${id}' not found`);
    const updated: VideoTemplate = {
      ...existing,
      ...update,
      updated_at: new Date().toISOString(),
    };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  async listTemplates(category?: TemplateCategory): Promise<VideoTemplate[]> {
    const all = Array.from(this.templates.values());
    if (!category) return all;
    return all.filter(t => t.category === category);
  }

  private seedSystemTemplates() {
    const now = new Date().toISOString();
    const systemTemplates: VideoTemplate[] = [
      {
        id: 'tmpl-real-estate',
        name: 'Real Estate Property Showcase',
        category: 'real_estate',
        description: 'Professional property walkthrough video generated from property photos and details.',
        icon: '🏡',
        is_system: true,
        fields: [
          { key: 'property_title', label: 'Property Title', type: 'text', required: true, placeholder: 'e.g. Luxury Oceanview Villa' },
          { key: 'location', label: 'Location / Address', type: 'text', required: true, placeholder: 'e.g. Malibu, California' },
          { key: 'property_images', label: 'Property Photo URLs (1 per line)', type: 'images', required: true, max_items: 5 },
          { key: 'price', label: 'Listing Price', type: 'text', required: false, placeholder: 'e.g. $2,450,000' },
          { key: 'cta_contact', label: 'Realtor Phone / Email', type: 'text', required: true, placeholder: 'e.g. Call (555) 019-2831' },
        ],
        generation_config: {
          stage: 'images_to_video',
          aspect_ratio: '16:9',
          duration_seconds: 8,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tmpl-instagram-reel',
        name: 'Instagram Reel Viral Hook',
        category: 'social_media',
        description: 'High-energy vertical video for Instagram Reels and Stories with prominent text overlays.',
        icon: '📱',
        is_system: true,
        fields: [
          { key: 'hook_text', label: 'Viral Hook Text', type: 'text', required: true, placeholder: '3 AI Tools That Feel Illegal to Know...' },
          { key: 'cover_image', label: 'Cover / Reference Image URL', type: 'image', required: false },
          { key: 'brand_handle', label: 'Instagram Handle', type: 'text', required: true, placeholder: '@mybrand' },
        ],
        generation_config: {
          stage: 'script_to_video',
          aspect_ratio: '9:16',
          duration_seconds: 5,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tmpl-youtube-short',
        name: 'YouTube Short Quick Tip',
        category: 'social_media',
        description: 'Fast-paced vertical short video optimized for YouTube Shorts algorithm.',
        icon: '▶️',
        is_system: true,
        fields: [
          { key: 'topic', label: 'Tip Topic / Title', type: 'text', required: true, placeholder: 'How to 10x Your Productivity' },
          { key: 'script', label: 'Narration Script', type: 'textarea', required: true, placeholder: 'First, eliminate all notifications...' },
          { key: 'channel_name', label: 'Channel Name', type: 'text', required: true, placeholder: 'Tech Explained' },
        ],
        generation_config: {
          stage: 'script_to_video',
          aspect_ratio: '9:16',
          duration_seconds: 5,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tmpl-corporate-ad',
        name: 'Corporate Brand Commercial',
        category: 'corporate',
        description: 'Professional landscape commercial video for corporate websites and LinkedIn announcements.',
        icon: '🏢',
        is_system: true,
        fields: [
          { key: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'Acme Enterprise Solutions' },
          { key: 'tagline', label: 'Brand Tagline', type: 'text', required: true, placeholder: 'Innovating Tomorrow, Today' },
          { key: 'logo_url', label: 'Logo URL', type: 'image', required: false },
          { key: 'website', label: 'Website URL', type: 'text', required: true, placeholder: 'www.acmesolutions.com' },
        ],
        generation_config: {
          stage: 'script_to_video',
          aspect_ratio: '16:9',
          duration_seconds: 8,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tmpl-product-ad',
        name: 'Product Commercial Advertisement',
        category: 'product',
        description: 'Sleek product showcase video for e-commerce and launch marketing.',
        icon: '🛍️',
        is_system: true,
        fields: [
          { key: 'product_name', label: 'Product Name', type: 'text', required: true, placeholder: 'Aura Wireless Headphones' },
          { key: 'product_image', label: 'Product Photo URL', type: 'image', required: true },
          { key: 'key_feature', label: 'Key Feature / Benefit', type: 'text', required: true, placeholder: 'Active Noise Cancellation & 40h Battery' },
          { key: 'cta', label: 'Call to Action', type: 'text', required: true, placeholder: 'Shop Now at 30% Off' },
        ],
        generation_config: {
          stage: 'image_to_video',
          aspect_ratio: '1:1',
          duration_seconds: 5,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tmpl-travel-vlog',
        name: 'Travel Destination Highlight',
        category: 'travel',
        description: 'Cinematic travel landscape video featuring stunning drone motion.',
        icon: '✈️',
        is_system: true,
        fields: [
          { key: 'destination', label: 'Destination Name', type: 'text', required: true, placeholder: 'Santorini, Greece' },
          { key: 'description_prompt', label: 'Visual Scene Prompt', type: 'textarea', required: true, placeholder: 'White cliffside houses overlooking turquoise Aegean Sea at sunset' },
        ],
        generation_config: {
          stage: 'text_to_video',
          aspect_ratio: '16:9',
          duration_seconds: 5,
          resolution: '1080p',
        },
        created_at: now,
        updated_at: now,
      },
    ];

    systemTemplates.forEach(t => this.templates.set(t.id, t));
  }
}
