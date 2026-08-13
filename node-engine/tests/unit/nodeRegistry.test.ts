import { NodeRegistryService } from '../../src/domain/nodeRegistry';
import { InMemoryNodeRepository } from '../../src/infra/repository';
import { AppError } from '../../src/domain/types';

describe('NodeRegistryService', () => {
  let repo: InMemoryNodeRepository;
  let registry: NodeRegistryService;

  beforeEach(() => {
    repo = new InMemoryNodeRepository();
    registry = new NodeRegistryService(repo);
  });

  describe('seedDefaultNodes', () => {
    it('should seed default node catalog on initial call', async () => {
      await registry.seedDefaultNodes();
      const list = await registry.listNodes();
      expect(list.length).toBe(8);
      expect(list.map((n) => n.type)).toContain('text-to-image');
      expect(list.map((n) => n.type)).toContain('avatar-lipsync');
    });

    it('should not re-seed if nodes already exist', async () => {
      await registry.seedDefaultNodes();
      await registry.seedDefaultNodes();
      const list = await registry.listNodes();
      expect(list.length).toBe(8);
    });
  });

  describe('getNodeByType & registerNode', () => {
    it('should register custom node definition and retrieve by type', async () => {
      const node = await registry.registerNode({
        id: 'node-custom-crop',
        type: 'crop-image',
        category: 'processing',
        name: 'Crop Image Node',
        description: 'Crops image to target aspect ratio',
        inputs: [{ name: 'image', label: 'Image', type: 'image', required: true }],
        outputs: [{ name: 'cropped_image', label: 'Cropped Image', type: 'image', required: true }],
        params: [{ name: 'ratio', label: 'Aspect Ratio', type: 'select', options: ['1:1', '16:9'], required: true }],
      });

      expect(node.type).toBe('crop-image');

      const fetched = await registry.getNodeByType('crop-image');
      expect(fetched.name).toBe('Crop Image Node');
    });

    it('should throw AppError 409 when registering duplicate node type', async () => {
      await registry.registerNode({
        id: 'n1',
        type: 'dup-type',
        category: 'utility',
        name: 'N1',
        description: 'D',
        inputs: [],
        outputs: [],
        params: [],
      });

      await expect(
        registry.registerNode({
          id: 'n2',
          type: 'dup-type',
          category: 'utility',
          name: 'N2',
          description: 'D',
          inputs: [],
          outputs: [],
          params: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError 400 for missing type or name', async () => {
      await expect(
        registry.registerNode({
          id: 'n1',
          type: '',
          category: 'utility',
          name: '',
          description: '',
          inputs: [],
          outputs: [],
          params: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError 404 for non-existent node type', async () => {
      await expect(registry.getNodeByType('non-existent-type')).rejects.toThrow(AppError);
    });
  });

  describe('listNodes category filtering', () => {
    it('should filter node catalog by category', async () => {
      await registry.seedDefaultNodes();
      const generationNodes = await registry.listNodes({ category: 'generation' });
      expect(generationNodes.length).toBeGreaterThan(0);
      expect(generationNodes.every((n) => n.category === 'generation')).toBe(true);
    });
  });
});
