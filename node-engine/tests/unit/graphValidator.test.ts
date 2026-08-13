import { NodeRegistryService } from '../../src/domain/nodeRegistry';
import { GraphValidatorService } from '../../src/domain/graphValidator';
import { InMemoryNodeRepository } from '../../src/infra/repository';

describe('GraphValidatorService', () => {
  let registry: NodeRegistryService;
  let validator: GraphValidatorService;

  beforeEach(async () => {
    registry = new NodeRegistryService(new InMemoryNodeRepository());
    await registry.seedDefaultNodes();
    validator = new GraphValidatorService(registry);
  });

  it('should validate a compatible node graph cleanly', async () => {
    const result = await validator.validateGraph({
      nodes: [
        { id: 'n1', node_type: 'prompt-template' },
        { id: 'n2', node_type: 'text-to-image' },
        { id: 'n3', node_type: 'upscale' },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        { id: 'e2', source_node_id: 'n2', source_output: 'image', target_node_id: 'n3', target_input: 'image' },
      ],
    });

    expect(result.is_valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should flag PORT_TYPE_MISMATCH error when connecting incompatible port data types', async () => {
    const result = await validator.validateGraph({
      nodes: [
        { id: 'n1', node_type: 'text-to-image' }, // output: image
        { id: 'n2', node_type: 'text-to-audio' }, // input: text
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'image', target_node_id: 'n2', target_input: 'text' },
      ],
    });

    expect(result.is_valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('PORT_TYPE_MISMATCH');
    expect(result.errors[0].message).toContain("Cannot connect output port 'image' (type 'image')");
  });

  it('should flag UNKNOWN_NODE_TYPE, INVALID_SOURCE_NODE, and UNKNOWN_INPUT_PORT errors', async () => {
    const result = await validator.validateGraph({
      nodes: [
        { id: 'n1', node_type: 'invalid-type' },
        { id: 'n2', node_type: 'upscale' },
      ],
      edges: [
        { id: 'e1', source_node_id: 'non-existent-source', source_output: 'out', target_node_id: 'n2', target_input: 'image' },
        { id: 'e2', source_node_id: 'n2', source_output: 'image', target_node_id: 'n2', target_input: 'invalid-input-port' },
      ],
    });

    expect(result.is_valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_NODE_TYPE')).toBe(true);
    expect(result.errors.some((e) => e.code === 'INVALID_SOURCE_NODE')).toBe(true);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_INPUT_PORT')).toBe(true);
  });

  it('should return warning for empty graph', async () => {
    const result = await validator.validateGraph({ nodes: [], edges: [] });
    expect(result.is_valid).toBe(true);
    expect(result.warnings.length).toBe(1);
  });
});
