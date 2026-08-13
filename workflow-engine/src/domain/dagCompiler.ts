import { WorkflowDefinition, ExecutionPlan, ExecutionStage, AppError } from './types';

export class DagCompiler {
  compile(workflow: WorkflowDefinition): ExecutionPlan {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    if (nodes.length === 0) {
      return {
        workflow_id: workflow.id,
        workflow_version: workflow.version,
        stages: [],
        topological_order: [],
      };
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    // Validate edge references
    for (const edge of edges) {
      if (!nodeIds.has(edge.source_node_id)) {
        throw new AppError(400, 'INVALID_EDGE', `Edge source node '${edge.source_node_id}' does not exist in workflow`);
      }
      if (!nodeIds.has(edge.target_node_id)) {
        throw new AppError(400, 'INVALID_EDGE', `Edge target node '${edge.target_node_id}' does not exist in workflow`);
      }
    }

    // Build Adjacency List & In-Degrees
    const inDegree: Map<string, number> = new Map();
    const adjList: Map<string, string[]> = new Map();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      adjList.get(edge.source_node_id)!.push(edge.target_node_id);
      inDegree.set(edge.target_node_id, inDegree.get(edge.target_node_id)! + 1);
    }

    // Kahn's Algorithm for Topological Sort & Stage Compilation
    const stages: ExecutionStage[] = [];
    const topological_order: string[] = [];
    let currentStageNodes: string[] = [];

    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        currentStageNodes.push(id);
      }
    }

    const inDegreeCopy = new Map(inDegree);
    let stageIndex = 0;

    while (currentStageNodes.length > 0) {
      stages.push({
        stage_index: stageIndex,
        node_ids: [...currentStageNodes].sort(),
      });

      topological_order.push(...currentStageNodes.sort());

      const nextStageNodes: string[] = [];

      for (const node of currentStageNodes) {
        const neighbors = adjList.get(node) || [];
        for (const neighbor of neighbors) {
          const newDeg = inDegreeCopy.get(neighbor)! - 1;
          inDegreeCopy.set(neighbor, newDeg);
          if (newDeg === 0) {
            nextStageNodes.push(neighbor);
          }
        }
      }

      currentStageNodes = nextStageNodes;
      stageIndex++;
    }

    // Cycle Detection Check
    if (topological_order.length !== nodes.length) {
      throw new AppError(400, 'DAG_CYCLE_DETECTED', 'Workflow node graph contains a circular dependency');
    }

    return {
      workflow_id: workflow.id,
      workflow_version: workflow.version,
      stages,
      topological_order,
    };
  }
}
