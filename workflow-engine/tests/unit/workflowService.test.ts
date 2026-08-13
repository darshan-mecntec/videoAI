import { WorkflowService } from '../../src/domain/workflowService';
import { DagCompiler } from '../../src/domain/dagCompiler';
import { InMemoryWorkflowRepository } from '../../src/infra/repository';
import { MockRoutingEngineClient } from '../../src/infra/routingClient';
import { InMemoryEventBus } from '../../src/events/publisher';
import { AppError } from '../../src/domain/types';

describe('WorkflowService', () => {
  let repo: InMemoryWorkflowRepository;
  let dagCompiler: DagCompiler;
  let routingClient: MockRoutingEngineClient;
  let eventPublisher: InMemoryEventBus;
  let workflowService: WorkflowService;

  beforeEach(() => {
    repo = new InMemoryWorkflowRepository();
    dagCompiler = new DagCompiler();
    routingClient = new MockRoutingEngineClient();
    eventPublisher = new InMemoryEventBus();
    workflowService = new WorkflowService(repo, dagCompiler, routingClient, eventPublisher);
  });

  describe('createWorkflow & versioning', () => {
    it('should create workflow definition and validate DAG', async () => {
      const workflow = await workflowService.createWorkflow({
        project_id: 'proj-100',
        name: 'Ad Generator',
        description: 'Generates ad variants',
        nodes: [
          { id: 'n1', name: 'Prompt', node_type: 'prompt', params: {}, inputs: [], outputs: [] },
          { id: 'n2', name: 'T2I', node_type: 'generation', capability_type: 'text-to-image', params: {}, inputs: [], outputs: [] },
        ],
        edges: [
          { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        ],
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.version).toBe(1);
      expect(workflow.name).toBe('Ad Generator');
    });

    it('should throw AppError 400 when missing required input fields', async () => {
      await expect(
        workflowService.createWorkflow({
          project_id: '',
          name: 'Test',
          nodes: [],
          edges: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should update workflow and increment version number', async () => {
      const workflow = await workflowService.createWorkflow({
        project_id: 'proj-100',
        name: 'Initial Name',
        nodes: [],
        edges: [],
      });

      const updated = await workflowService.updateWorkflow(workflow.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.version).toBe(2);
    });

    it('should throw AppError 404 when getting or updating non-existent workflow', async () => {
      await expect(workflowService.getWorkflow('invalid-id')).rejects.toThrow(AppError);
      await expect(workflowService.updateWorkflow('invalid-id', { name: 'X' })).rejects.toThrow(AppError);
    });

    it('should throw AppError 404 when repository update returns null', async () => {
      const workflow = await workflowService.createWorkflow({
        project_id: 'proj-100',
        name: 'Initial Name',
        nodes: [],
        edges: [],
      });

      jest.spyOn(repo, 'updateWorkflow').mockResolvedValueOnce(null);
      await expect(workflowService.updateWorkflow(workflow.id, { name: 'X' })).rejects.toThrow(AppError);
    });
  });

  describe('listWorkflows', () => {
    it('should list workflows with pagination and project filter', async () => {
      await workflowService.createWorkflow({ project_id: 'p1', name: 'W1', nodes: [], edges: [] });
      await workflowService.createWorkflow({ project_id: 'p1', name: 'W2', nodes: [], edges: [] });

      const res = await workflowService.listWorkflows({ project_id: 'p1', limit: 1 });
      expect(res.workflows.length).toBe(1);
      expect(res.next_cursor).not.toBeNull();

      const page2 = await workflowService.listWorkflows({ project_id: 'p1', cursor: res.next_cursor!, limit: 1 });
      expect(page2.workflows.length).toBe(1);
    });
  });

  describe('startRun & execution orchestration', () => {
    it('should start workflow run and complete execution asynchronously with mixed node types', async () => {
      const workflow = await workflowService.createWorkflow({
        project_id: 'proj-100',
        name: 'Async Pipeline',
        nodes: [
          { id: 'n1', name: 'Text Prompt', node_type: 'prompt', params: { text: 'Hello' }, inputs: [], outputs: [] },
          { id: 'n2', name: 'T2I', node_type: 'generation', capability_type: 'text-to-image', params: { size: '1024x1024' }, inputs: [], outputs: [] },
        ],
        edges: [
          { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        ],
      });

      const run = await workflowService.startRun(workflow.id, { user_id: 'user-1' });
      expect(run.run_id).toBeDefined();
      expect(run.status).toBe('queued');

      // Wait briefly for setImmediate execution to finish
      await new Promise((resolve) => setTimeout(resolve, 50));

      const completedRun = await workflowService.getRun(run.run_id);
      expect(completedRun.status).toBe('completed');
      expect(completedRun.steps['n1'].status).toBe('completed');
      expect(completedRun.steps['n2'].status).toBe('completed');
      expect(completedRun.steps['n2'].selected_provider_id).toBe('provider-text-to-image');

      // Verify published events
      const eventNames = eventPublisher.publishedEvents.map((e) => e.event_name);
      expect(eventNames).toContain('workflow.run.started');
      expect(eventNames).toContain('workflow.step.completed');
      expect(eventNames).toContain('workflow.run.completed');
    });

    it('should mark run as failed when step execution throws a string error', async () => {
      const workflow = await workflowService.createWorkflow({
        project_id: 'proj-100',
        name: 'Failing Pipeline',
        nodes: [
          { id: 'n1', name: 'Failing Node', node_type: 'generation', capability_type: 'text-to-image', params: {}, inputs: [], outputs: [] },
        ],
        edges: [],
      });

      jest.spyOn(routingClient, 'routeCapability').mockRejectedValueOnce('Raw string rejection');

      const run = await workflowService.startRun(workflow.id);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const failedRun = await workflowService.getRun(run.run_id);
      expect(failedRun.status).toBe('failed');
      expect(failedRun.steps['n1'].status).toBe('failed');
      expect(failedRun.steps['n1'].error).toBe('Step execution error');
    });

    it('should throw AppError 404 when querying non-existent run_id', async () => {
      await expect(workflowService.getRun('invalid-run-id')).rejects.toThrow(AppError);
    });
  });
});
