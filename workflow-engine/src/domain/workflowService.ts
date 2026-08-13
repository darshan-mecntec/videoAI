import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowDefinition,
  WorkflowRunInstance,
  WorkflowStepState,
  AppError
} from './types';
import { DagCompiler } from './dagCompiler';
import { WorkflowRepository } from '../infra/repository';
import { RoutingEngineClient } from '../infra/routingClient';
import { EventPublisher } from '../events/publisher';

export interface CreateWorkflowInput {
  project_id: string;
  name: string;
  description?: string;
  nodes: WorkflowDefinition['nodes'];
  edges: WorkflowDefinition['edges'];
}

export class WorkflowService {
  constructor(
    private repo: WorkflowRepository,
    private dagCompiler: DagCompiler,
    private routingClient: RoutingEngineClient,
    private eventPublisher: EventPublisher
  ) {}

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDefinition> {
    if (!input.name || !input.project_id) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: name, project_id');
    }

    const now = new Date().toISOString();
    const workflow: WorkflowDefinition = {
      id: uuidv4(),
      project_id: input.project_id,
      name: input.name,
      description: input.description || '',
      version: 1,
      nodes: input.nodes || [],
      edges: input.edges || [],
      created_at: now,
      updated_at: now,
    };

    // Validate DAG structure on creation
    this.dagCompiler.compile(workflow);

    return this.repo.createWorkflow(workflow);
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition> {
    const workflow = await this.repo.findWorkflowById(id);
    if (!workflow) {
      throw new AppError(404, 'WORKFLOW_NOT_FOUND', `Workflow with id '${id}' not found`);
    }
    return workflow;
  }

  async listWorkflows(options?: { project_id?: string; limit?: number; cursor?: string }): Promise<{ workflows: WorkflowDefinition[]; next_cursor: string | null }> {
    return this.repo.findWorkflows(options);
  }

  async updateWorkflow(id: string, updates: Partial<CreateWorkflowInput>): Promise<WorkflowDefinition> {
    const existing = await this.getWorkflow(id);

    const updatedWorkflow: WorkflowDefinition = {
      ...existing,
      name: updates.name || existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      nodes: updates.nodes || existing.nodes,
      edges: updates.edges || existing.edges,
      version: existing.version + 1, // Increment version per engineering rules
      updated_at: new Date().toISOString(),
    };

    // Validate updated DAG structure
    this.dagCompiler.compile(updatedWorkflow);

    const result = await this.repo.updateWorkflow(id, updatedWorkflow);
    if (!result) {
      throw new AppError(404, 'WORKFLOW_NOT_FOUND', `Workflow with id '${id}' not found`);
    }
    return result;
  }

  async startRun(workflowId: string, options?: { user_id?: string; inputs?: Record<string, unknown> }): Promise<WorkflowRunInstance> {
    const workflow = await this.getWorkflow(workflowId);

    // Compile execution plan
    const executionPlan = this.dagCompiler.compile(workflow);

    const runId = uuidv4();
    const userId = options?.user_id || 'user-default';
    const now = new Date().toISOString();

    const steps: Record<string, WorkflowStepState> = {};
    for (const node of workflow.nodes) {
      steps[node.id] = {
        step_id: `step-${node.id}`,
        node_id: node.id,
        status: 'pending',
      };
    }

    const runInstance: WorkflowRunInstance = {
      run_id: runId,
      workflow_id: workflow.id,
      workflow_version: workflow.version,
      project_id: workflow.project_id,
      user_id: userId,
      status: 'queued',
      execution_plan: executionPlan,
      steps,
      inputs: options?.inputs || {},
      outputs: {},
      started_at: now,
    };

    await this.repo.createRunInstance(runInstance);

    // Execute run asynchronously without blocking API response
    setImmediate(() => {
      this.executeRun(runId).catch((err) => {
        console.error(`[workflow-engine] Run ${runId} execution error:`, err);
      });
    });

    return runInstance;
  }

  async getRun(runId: string): Promise<WorkflowRunInstance> {
    const run = await this.repo.findRunInstanceById(runId);
    if (!run) {
      throw new AppError(404, 'RUN_NOT_FOUND', `Workflow run with id '${runId}' not found`);
    }
    return run;
  }

  private async executeRun(runId: string): Promise<void> {
    const run = await this.repo.findRunInstanceById(runId);
    if (!run) return;

    // Transition to running & emit started event
    run.status = 'running';
    await this.repo.updateRunInstance(runId, { status: 'running' });

    await this.eventPublisher.publish({
      event_name: 'workflow.run.started',
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload: {
        run_id: run.run_id,
        workflow_id: run.workflow_id,
        user_id: run.user_id,
        started_at: run.started_at,
      },
    });

    const workflow = await this.getWorkflow(run.workflow_id);
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

    // Process stages sequentially (nodes within stage in parallel)
    for (const stage of run.execution_plan.stages) {
      for (const nodeId of stage.node_ids) {
        const node = nodeMap.get(nodeId);
        const step = run.steps[nodeId];
        if (!node || !step) continue;

        step.status = 'running';
        step.started_at = new Date().toISOString();

        try {
          if (node.capability_type) {
            const routeResult = await this.routingClient.routeCapability(node.capability_type);
            step.selected_provider_id = routeResult.selected_provider.provider_id;
            step.selected_model_id = routeResult.selected_provider.model_id;
          }

          step.status = 'completed';
          step.completed_at = new Date().toISOString();
          step.output_ref = {
            result_url: `https://storage.platform.internal/assets/${runId}/${nodeId}.png`,
            params_used: node.params,
          };

          run.outputs[nodeId] = step.output_ref;

          await this.eventPublisher.publish({
            event_name: 'workflow.step.completed',
            version: 'v1',
            timestamp: new Date().toISOString(),
            payload: {
              run_id: run.run_id,
              step_id: step.step_id,
              output_ref: step.output_ref,
            },
          });
        } catch (err) {
          step.status = 'failed';
          step.error = err instanceof Error ? err.message : 'Step execution error';
          run.status = 'failed';
        }
      }
    }

    if (run.status !== 'failed') {
      run.status = 'completed';
    }
    run.completed_at = new Date().toISOString();
    await this.repo.updateRunInstance(runId, run);

    await this.eventPublisher.publish({
      event_name: 'workflow.run.completed',
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload: {
        run_id: run.run_id,
        workflow_id: run.workflow_id,
        status: run.status,
        outputs: run.outputs,
      },
    });
  }
}
