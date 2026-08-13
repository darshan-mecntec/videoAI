import request from 'supertest';
import { createApp } from '../../src/app';

describe('Workflow Engine API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  it('should flow through lifecycle: create workflow -> update (v2) -> run (202) -> poll run status', async () => {
    // 1. Create Workflow
    const createRes = await request(appInstance.app)
      .post('/v1/workflows')
      .set('X-Request-ID', 'wf-req-1')
      .send({
        project_id: 'proj-video-1',
        name: 'Video Ad Pipeline',
        description: 'Generates video ads',
        nodes: [
          { id: 'n1', name: 'Script', node_type: 'prompt', params: {}, inputs: [], outputs: [] },
          { id: 'n2', name: 'T2V', node_type: 'generation', capability_type: 'text-to-video', params: {}, inputs: [], outputs: [] },
        ],
        edges: [
          { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.headers['x-request-id']).toBe('wf-req-1');
    const workflowId = createRes.body.workflow.id;
    expect(createRes.body.workflow.version).toBe(1);

    // 2. Get Workflow
    const getRes = await request(appInstance.app).get(`/v1/workflows/${workflowId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.workflow.name).toBe('Video Ad Pipeline');

    // 3. Update Workflow (increments version to 2)
    const patchRes = await request(appInstance.app)
      .patch(`/v1/workflows/${workflowId}`)
      .send({ name: 'Updated Video Ad Pipeline v2' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.workflow.version).toBe(2);

    // 4. List Workflows
    const listRes = await request(appInstance.app).get('/v1/workflows').query({ project_id: 'proj-video-1' });
    expect(listRes.status).toBe(200);
    expect(listRes.body.workflows.length).toBe(1);

    // 5. Run Workflow (Returns 202 Accepted)
    const runRes = await request(appInstance.app)
      .post(`/v1/workflows/${workflowId}/run`)
      .send({ user_id: 'usr-1', inputs: { topic: 'AI Platform Launch' } });

    expect(runRes.status).toBe(202);
    expect(runRes.body.run_id).toBeDefined();
    expect(runRes.body.status).toBe('queued');
    const runId = runRes.body.run_id;

    // 6. Poll Run Status
    await new Promise((resolve) => setTimeout(resolve, 50));
    const pollRes = await request(appInstance.app).get(`/v1/workflows/runs/${runId}`);
    expect(pollRes.status).toBe(200);
    expect(pollRes.body.run.status).toBe('completed');
  });

  it('should return 400 when creating workflow with a DAG cycle', async () => {
    const res = await request(appInstance.app)
      .post('/v1/workflows')
      .send({
        project_id: 'proj-1',
        name: 'Cyclic Graph',
        nodes: [
          { id: 'a', name: 'A', node_type: 'n', params: {}, inputs: [], outputs: [] },
          { id: 'b', name: 'B', node_type: 'n', params: {}, inputs: [], outputs: [] },
        ],
        edges: [
          { id: 'e1', source_node_id: 'a', source_output: 'o', target_node_id: 'b', target_input: 'i' },
          { id: 'e2', source_node_id: 'b', source_output: 'o', target_node_id: 'a', target_input: 'i' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DAG_CYCLE_DETECTED');
  });

  it('should handle API errors for invalid workflow or run IDs', async () => {
    const getWfRes = await request(appInstance.app).get('/v1/workflows/non-existent');
    expect(getWfRes.status).toBe(404);
    expect(getWfRes.body.error.code).toBe('WORKFLOW_NOT_FOUND');

    const getRunRes = await request(appInstance.app).get('/v1/workflows/runs/non-existent');
    expect(getRunRes.status).toBe(404);
    expect(getRunRes.body.error.code).toBe('RUN_NOT_FOUND');
  });

  it('should handle unhandled 500 error in error middleware', async () => {
    jest.spyOn(appInstance.workflowService, 'listWorkflows').mockRejectedValueOnce(new Error('Internal database fault'));
    const res = await request(appInstance.app).get('/v1/workflows');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Internal database fault');
  });
});
