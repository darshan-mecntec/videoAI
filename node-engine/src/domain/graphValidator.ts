import {
  GraphValidationRequest,
  GraphValidationResult,
  GraphValidationError,
  PortDataType
} from './types';
import { NodeRegistryService } from './nodeRegistry';

export class GraphValidatorService {
  constructor(private registry: NodeRegistryService) {}

  async validateGraph(req: GraphValidationRequest): Promise<GraphValidationResult> {
    const errors: GraphValidationError[] = [];
    const warnings: string[] = [];

    const nodes = req.nodes || [];
    const edges = req.edges || [];

    if (nodes.length === 0) {
      return { is_valid: true, errors: [], warnings: ['Graph contains no nodes.'] };
    }

    // 1. Validate node types exist in registry & build node map
    const nodeDefMap = new Map<string, { id: string; type: string; inputs: Map<string, PortDataType>; outputs: Map<string, PortDataType> }>();

    for (const node of nodes) {
      try {
        const def = await this.registry.getNodeByType(node.node_type);
        const inputsMap = new Map(def.inputs.map((i) => [i.name, i.type]));
        const outputsMap = new Map(def.outputs.map((o) => [o.name, o.type]));

        nodeDefMap.set(node.id, {
          id: node.id,
          type: node.node_type,
          inputs: inputsMap,
          outputs: outputsMap,
        });
      } catch (_) {
        errors.push({
          node_id: node.id,
          code: 'UNKNOWN_NODE_TYPE',
          message: `Node '${node.id}' specifies unknown node_type '${node.node_type}'`,
        });
      }
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    // 2. Validate Edges & Port Data Type Compatibility
    for (const edge of edges) {
      if (!nodeIds.has(edge.source_node_id)) {
        errors.push({
          edge_id: edge.id,
          code: 'INVALID_SOURCE_NODE',
          message: `Edge '${edge.id}' source node '${edge.source_node_id}' does not exist in graph`,
        });
        continue;
      }

      if (!nodeIds.has(edge.target_node_id)) {
        errors.push({
          edge_id: edge.id,
          code: 'INVALID_TARGET_NODE',
          message: `Edge '${edge.id}' target node '${edge.target_node_id}' does not exist in graph`,
        });
        continue;
      }

      const sourceNode = nodeDefMap.get(edge.source_node_id);
      const targetNode = nodeDefMap.get(edge.target_node_id);

      if (!sourceNode || !targetNode) continue;

      const outputType = sourceNode.outputs.get(edge.source_output);
      if (!outputType) {
        errors.push({
          edge_id: edge.id,
          code: 'UNKNOWN_OUTPUT_PORT',
          message: `Source node '${edge.source_node_id}' (${sourceNode.type}) has no output port '${edge.source_output}'`,
        });
        continue;
      }

      const inputType = targetNode.inputs.get(edge.target_input);
      if (!inputType) {
        errors.push({
          edge_id: edge.id,
          code: 'UNKNOWN_INPUT_PORT',
          message: `Target node '${edge.target_node_id}' (${targetNode.type}) has no input port '${edge.target_input}'`,
        });
        continue;
      }

      // Check port data type compatibility
      const isCompatible =
        outputType === inputType ||
        (outputType === 'json' && inputType === 'string') ||
        (outputType === 'string' && inputType === 'json');

      if (!isCompatible) {
        errors.push({
          edge_id: edge.id,
          code: 'PORT_TYPE_MISMATCH',
          message: `Cannot connect output port '${edge.source_output}' (type '${outputType}') of node '${edge.source_node_id}' to input port '${edge.target_input}' (type '${inputType}') of node '${edge.target_node_id}'`,
        });
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
