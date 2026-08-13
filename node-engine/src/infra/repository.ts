import { NodeTypeDefinition } from '../domain/types';

export interface NodeRepository {
  findNodes(options?: { category?: string }): Promise<NodeTypeDefinition[]>;
  findNodeByType(type: string): Promise<NodeTypeDefinition | null>;
  createNode(node: NodeTypeDefinition): Promise<NodeTypeDefinition>;
}

export class InMemoryNodeRepository implements NodeRepository {
  private nodes: Map<string, NodeTypeDefinition> = new Map();

  async findNodes(options?: { category?: string }): Promise<NodeTypeDefinition[]> {
    let list = Array.from(this.nodes.values());
    if (options?.category) {
      list = list.filter((n) => n.category === options.category);
    }
    return list;
  }

  async findNodeByType(type: string): Promise<NodeTypeDefinition | null> {
    return this.nodes.get(type) || null;
  }

  async createNode(node: NodeTypeDefinition): Promise<NodeTypeDefinition> {
    this.nodes.set(node.type, node);
    return node;
  }
}
