import { DagCompiler } from '../../src/domain/dagCompiler';
import { WorkflowDefinition, AppError } from '../../src/domain/types';

describe('DagCompiler', () => {
  let compiler: DagCompiler;

  beforeEach(() => {
    compiler = new DagCompiler();
  });

  const baseWorkflow: WorkflowDefinition = {
    id: 'wf-1',
    project_id: 'proj-1',
    name: 'Sample Workflow',
    description: 'Test',
    version: 1,
    nodes: [],
    edges: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should compile an empty workflow without errors', () => {
    const plan = compiler.compile(baseWorkflow);
    expect(plan.stages).toEqual([]);
    expect(plan.topological_order).toEqual([]);
  });

  it('should compile a linear 3-node pipeline into 3 sequential stages', () => {
    const workflow: WorkflowDefinition = {
      ...baseWorkflow,
      nodes: [
        { id: 'n1', name: 'Prompt', node_type: 'prompt', params: {}, inputs: [], outputs: [] },
        { id: 'n2', name: 'T2I', node_type: 'generation', capability_type: 'text-to-image', params: {}, inputs: [], outputs: [] },
        { id: 'n3', name: 'Upscale', node_type: 'upscale', capability_type: 'upscale', params: {}, inputs: [], outputs: [] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        { id: 'e2', source_node_id: 'n2', source_output: 'image', target_node_id: 'n3', target_input: 'image' },
      ],
    };

    const plan = compiler.compile(workflow);
    expect(plan.stages.length).toBe(3);
    expect(plan.stages[0].node_ids).toEqual(['n1']);
    expect(plan.stages[1].node_ids).toEqual(['n2']);
    expect(plan.stages[2].node_ids).toEqual(['n3']);
    expect(plan.topological_order).toEqual(['n1', 'n2', 'n3']);
  });

  it('should group independent nodes into the same execution stage for parallel run', () => {
    const workflow: WorkflowDefinition = {
      ...baseWorkflow,
      nodes: [
        { id: 'n1', name: 'Prompt', node_type: 'prompt', params: {}, inputs: [], outputs: [] },
        { id: 'n2a', name: 'Image Branch', node_type: 't2i', capability_type: 'text-to-image', params: {}, inputs: [], outputs: [] },
        { id: 'n2b', name: 'Audio Branch', node_type: 't2a', capability_type: 'text-to-audio', params: {}, inputs: [], outputs: [] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2a', target_input: 'prompt' },
        { id: 'e2', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2b', target_input: 'prompt' },
      ],
    };

    const plan = compiler.compile(workflow);
    expect(plan.stages.length).toBe(2);
    expect(plan.stages[0].node_ids).toEqual(['n1']);
    expect(plan.stages[1].node_ids).toEqual(['n2a', 'n2b']);
  });

  it('should throw AppError 400 when DAG contains a cycle', () => {
    const cyclicWorkflow: WorkflowDefinition = {
      ...baseWorkflow,
      nodes: [
        { id: 'n1', name: 'Node 1', node_type: 'n', params: {}, inputs: [], outputs: [] },
        { id: 'n2', name: 'Node 2', node_type: 'n', params: {}, inputs: [], outputs: [] },
      ],
      edges: [
        { id: 'e1', source_node_id: 'n1', source_output: 'out', target_node_id: 'n2', target_input: 'in' },
        { id: 'e2', source_node_id: 'n2', source_output: 'out', target_node_id: 'n1', target_input: 'in' },
      ],
    };

    expect(() => compiler.compile(cyclicWorkflow)).toThrow(AppError);
  });

  it('should throw AppError 400 when edge references non-existent node', () => {
    const invalidEdgeWorkflow: WorkflowDefinition = {
      ...baseWorkflow,
      nodes: [{ id: 'n1', name: 'Node 1', node_type: 'n', params: {}, inputs: [], outputs: [] }],
      edges: [{ id: 'e1', source_node_id: 'n1', source_output: 'out', target_node_id: 'non-existent', target_input: 'in' }],
    };

    expect(() => compiler.compile(invalidEdgeWorkflow)).toThrow(AppError);
  });
});
