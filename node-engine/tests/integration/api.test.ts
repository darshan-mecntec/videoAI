import request from 'supertest';
import { createApp } from '../../src/app';

describe('Node Engine API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(async () => {
    appInstance = createApp();
    await appInstance.nodeRegistry.seedDefaultNodes();
  });

  it('should flow through lifecycle: list nodes -> get node details -> validate valid graph -> validate invalid port graph', async () => {
    // 1. List Nodes
    const listRes = await request(appInstance.app)
      .get('/v1/nodes')
      .set('X-Request-ID', 'node-req-1')
      .query({ category: 'generation' });

    expect(listRes.status).toBe(200);
    expect(listRes.headers['x-request-id']).toBe('node-req-1');
    expect(listRes.body.nodes.length).toBeGreaterThan(0);

    // 2. Get Node Details
    const getRes = await request(appInstance.app).get('/v1/nodes/text-to-image');
    expect(getRes.status).toBe(200);
    expect(getRes.body.node.type).toBe('text-to-image');
    expect(getRes.body.node.outputs[0].type).toBe('image');

    // 3. Validate Valid Graph
    const validGraphRes = await request(appInstance.app)
      .post('/v1/nodes/validate-graph')
      .send({
        nodes: [
          { id: 'n1', node_type: 'prompt-template' },
          { id: 'n2', node_type: 'text-to-image' },
        ],
        edges: [
          { id: 'e1', source_node_id: 'n1', source_output: 'text', target_node_id: 'n2', target_input: 'prompt' },
        ],
      });

    expect(validGraphRes.status).toBe(200);
    expect(validGraphRes.body.is_valid).toBe(true);

    // 4. Validate Invalid Port Type Graph
    const invalidGraphRes = await request(appInstance.app)
      .post('/v1/nodes/validate-graph')
      .send({
        nodes: [
          { id: 'n1', node_type: 'text-to-image' },
          { id: 'n2', node_type: 'text-to-audio' },
        ],
        edges: [
          { id: 'e1', source_node_id: 'n1', source_output: 'image', target_node_id: 'n2', target_input: 'text' },
        ],
      });

    expect(invalidGraphRes.status).toBe(200);
    expect(invalidGraphRes.body.is_valid).toBe(false);
    expect(invalidGraphRes.body.errors[0].code).toBe('PORT_TYPE_MISMATCH');
  });

  it('should register custom node definition via POST /v1/nodes', async () => {
    const res = await request(appInstance.app)
      .post('/v1/nodes')
      .send({
        id: 'node-background-remover',
        type: 'bg-remove',
        category: 'processing',
        name: 'Background Remover',
        description: 'Removes background from image',
        inputs: [{ name: 'image', label: 'Image', type: 'image', required: true }],
        outputs: [{ name: 'png_image', label: 'PNG Image', type: 'image', required: true }],
        params: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.node.type).toBe('bg-remove');
  });

  it('should handle API errors for missing node type or invalid input', async () => {
    const getRes = await request(appInstance.app).get('/v1/nodes/invalid-type');
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NODE_NOT_FOUND');

    const regRes = await request(appInstance.app).post('/v1/nodes').send({ type: '', name: '' });
    expect(regRes.status).toBe(400);
    expect(regRes.body.error.code).toBe('INVALID_INPUT');
  });

  it('should handle unhandled 500 error in error middleware', async () => {
    jest.spyOn(appInstance.nodeRegistry, 'listNodes').mockRejectedValueOnce(new Error('Internal database failure'));
    const res = await request(appInstance.app).get('/v1/nodes');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Internal database failure');
  });
});
