import { WorkflowDefinition, WorkflowRunInstance } from '../domain/types';

export interface WorkflowRepository {
  // Definition operations
  findWorkflows(options?: { project_id?: string; limit?: number; cursor?: string }): Promise<{ workflows: WorkflowDefinition[]; next_cursor: string | null }>;
  findWorkflowById(id: string): Promise<WorkflowDefinition | null>;
  createWorkflow(workflow: WorkflowDefinition): Promise<WorkflowDefinition>;
  updateWorkflow(id: string, updates: Partial<Omit<WorkflowDefinition, 'id' | 'created_at'>>): Promise<WorkflowDefinition | null>;

  // Run instance operations
  createRunInstance(run: WorkflowRunInstance): Promise<WorkflowRunInstance>;
  findRunInstanceById(runId: string): Promise<WorkflowRunInstance | null>;
  updateRunInstance(runId: string, updates: Partial<Omit<WorkflowRunInstance, 'run_id'>>): Promise<WorkflowRunInstance | null>;
}

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runInstances: Map<string, WorkflowRunInstance> = new Map();

  async findWorkflows(options?: { project_id?: string; limit?: number; cursor?: string }): Promise<{ workflows: WorkflowDefinition[]; next_cursor: string | null }> {
    let list = Array.from(this.workflows.values());
    if (options?.project_id) {
      list = list.filter((w) => w.project_id === options.project_id);
    }
    const limit = options?.limit || 20;
    let startIndex = 0;
    if (options?.cursor) {
      const idx = list.findIndex((w) => w.id === options.cursor);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }
    const sliced = list.slice(startIndex, startIndex + limit);
    const next_cursor = startIndex + limit < list.length && sliced.length > 0 ? sliced[sliced.length - 1].id : null;
    return { workflows: sliced, next_cursor };
  }

  async findWorkflowById(id: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(id) || null;
  }

  async createWorkflow(workflow: WorkflowDefinition): Promise<WorkflowDefinition> {
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<Omit<WorkflowDefinition, 'id' | 'created_at'>>): Promise<WorkflowDefinition | null> {
    const existing = this.workflows.get(id);
    if (!existing) return null;
    const updated: WorkflowDefinition = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.workflows.set(id, updated);
    return updated;
  }

  async createRunInstance(run: WorkflowRunInstance): Promise<WorkflowRunInstance> {
    this.runInstances.set(run.run_id, run);
    return run;
  }

  async findRunInstanceById(runId: string): Promise<WorkflowRunInstance | null> {
    return this.runInstances.get(runId) || null;
  }

  async updateRunInstance(runId: string, updates: Partial<Omit<WorkflowRunInstance, 'run_id'>>): Promise<WorkflowRunInstance | null> {
    const existing = this.runInstances.get(runId);
    if (!existing) return null;
    const updated: WorkflowRunInstance = {
      ...existing,
      ...updates,
    };
    this.runInstances.set(runId, updated);
    return updated;
  }
}
