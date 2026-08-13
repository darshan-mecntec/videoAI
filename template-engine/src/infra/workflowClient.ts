export interface ForkedWorkflowResult {
  workflow: {
    id: string;
    project_id: string;
    name: string;
    description: string;
    version: number;
    nodes: Array<{ id: string; name: string; node_type: string }>;
    edges: Array<{ id: string; source_node_id: string; target_node_id: string }>;
  };
}

export interface WorkflowEngineClient {
  createWorkflow(data: {
    project_id: string;
    name: string;
    description?: string;
    nodes: unknown[];
    edges: unknown[];
  }): Promise<ForkedWorkflowResult>;
}

export class MockWorkflowEngineClient implements WorkflowEngineClient {
  async createWorkflow(data: {
    project_id: string;
    name: string;
    description?: string;
    nodes: unknown[];
    edges: unknown[];
  }): Promise<ForkedWorkflowResult> {
    return {
      workflow: {
        id: `wf-forked-${Date.now()}`,
        project_id: data.project_id,
        name: data.name,
        description: data.description || '',
        version: 1,
        nodes: (data.nodes as Array<{ id: string; name: string; node_type: string }>) || [],
        edges: (data.edges as Array<{ id: string; source_node_id: string; target_node_id: string }>) || [],
      },
    };
  }
}

export class HttpWorkflowEngineClient implements WorkflowEngineClient {
  constructor(private baseUrl: string = process.env.WORKFLOW_API_URL || 'http://localhost:3002') {}

  async createWorkflow(data: {
    project_id: string;
    name: string;
    description?: string;
    nodes: unknown[];
    edges: unknown[];
  }): Promise<ForkedWorkflowResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Workflow engine HTTP ${response.status}`);
      }

      return (await response.json()) as ForkedWorkflowResult;
    } catch (err) {
      console.warn('[template-engine] Failed to call Workflow Engine API, using local fallback:', err);
      return new MockWorkflowEngineClient().createWorkflow(data);
    }
  }
}
