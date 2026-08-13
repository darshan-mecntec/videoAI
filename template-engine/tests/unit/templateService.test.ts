import { TemplateService } from '../../src/domain/templateService';
import { InMemoryTemplateRepository } from '../../src/infra/repository';
import { MockWorkflowEngineClient } from '../../src/infra/workflowClient';
import { AppError } from '../../src/domain/types';

describe('TemplateService', () => {
  let repo: InMemoryTemplateRepository;
  let workflowClient: MockWorkflowEngineClient;
  let templateService: TemplateService;

  beforeEach(() => {
    repo = new InMemoryTemplateRepository();
    workflowClient = new MockWorkflowEngineClient();
    templateService = new TemplateService(repo, workflowClient);
  });

  describe('seedStarterTemplates', () => {
    it('should seed starter templates on initial call', async () => {
      await templateService.seedStarterTemplates();
      const list = await templateService.listTemplates();
      expect(list.templates.length).toBe(3);
      expect(list.templates[0].slug).toBe('ecommerce-ad-suite');
    });

    it('should not re-seed if templates already exist', async () => {
      await templateService.seedStarterTemplates();
      await templateService.seedStarterTemplates();
      const list = await templateService.listTemplates();
      expect(list.templates.length).toBe(3);
    });
  });

  describe('createTemplate & getTemplate', () => {
    it('should create custom template with default fallback properties', async () => {
      const template = await templateService.createTemplate({
        slug: 'custom-minimal-template',
        title: 'Minimal Template',
        description: '',
        category: '' as any,
        modalities: [],
        nodes: [],
        edges: [],
      });

      expect(template.id).toBeDefined();
      expect(template.category).toBe('marketing');
      expect(template.modalities).toEqual([]);
      expect(template.variables).toEqual([]);
      expect(template.is_featured).toBe(false);
    });

    it('should throw AppError 409 when creating template with duplicate slug', async () => {
      await templateService.createTemplate({
        slug: 'dup-slug',
        title: 'Title 1',
        description: 'Desc',
        category: 'marketing',
        modalities: ['text-to-image'],
        nodes: [],
        edges: [],
      });

      await expect(
        templateService.createTemplate({
          slug: 'dup-slug',
          title: 'Title 2',
          description: 'Desc',
          category: 'marketing',
          modalities: ['text-to-image'],
          nodes: [],
          edges: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError 400 for missing title or slug', async () => {
      await expect(
        templateService.createTemplate({
          slug: '',
          title: '',
          description: '',
          category: 'marketing',
          modalities: [],
          nodes: [],
          edges: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError 404 when getting non-existent template', async () => {
      await expect(templateService.getTemplate('invalid-id')).rejects.toThrow(AppError);
    });
  });

  describe('listTemplates & pagination', () => {
    it('should filter templates by category and modality', async () => {
      await templateService.seedStarterTemplates();

      const ecommerceList = await templateService.listTemplates({ category: 'ecommerce' });
      expect(ecommerceList.templates.length).toBe(1);
      expect(ecommerceList.templates[0].category).toBe('ecommerce');

      const videoList = await templateService.listTemplates({ modality: 'text-to-video' });
      expect(videoList.templates.length).toBe(1);
      expect(videoList.templates[0].slug).toBe('social-video-prod');
    });

    it('should handle pagination cursor and limit', async () => {
      await templateService.seedStarterTemplates();

      const page1 = await templateService.listTemplates({ limit: 1 });
      expect(page1.templates.length).toBe(1);
      expect(page1.next_cursor).not.toBeNull();

      const page2 = await templateService.listTemplates({ cursor: page1.next_cursor!, limit: 1 });
      expect(page2.templates.length).toBe(1);
    });
  });

  describe('forkTemplate', () => {
    it('should fork template to Workflow Engine using default options', async () => {
      await templateService.seedStarterTemplates();
      const list = await templateService.listTemplates();
      const templateId = list.templates[0].id;

      const result = await templateService.forkTemplate(templateId);

      expect(result.workflow.id).toBeDefined();
      expect(result.workflow.project_id).toBe('proj-default');
      expect(result.workflow.name).toBe(`${list.templates[0].title} (Forked)`);
    });
  });
});
