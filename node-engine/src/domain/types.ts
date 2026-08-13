export type PortDataType = 'string' | 'image' | 'video' | 'audio' | 'json';

export interface NodePortDefinition {
  name: string;
  label: string;
  type: PortDataType;
  required: boolean;
  description?: string;
}

export interface NodeParamSchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json';
  default_value?: unknown;
  options?: string[];
  required: boolean;
  description?: string;
}

export interface NodeTypeDefinition {
  id: string;
  type: string;
  category: 'generation' | 'processing' | 'utility' | 'control';
  name: string;
  description: string;
  icon?: string;
  capability_type?: string;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  params: NodeParamSchema[];
}

export interface GraphValidationRequest {
  nodes: Array<{
    id: string;
    node_type: string;
    params?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source_node_id: string;
    source_output: string;
    target_node_id: string;
    target_input: string;
  }>;
}

export interface GraphValidationError {
  edge_id?: string;
  node_id?: string;
  code: string;
  message: string;
}

export interface GraphValidationResult {
  is_valid: boolean;
  errors: GraphValidationError[];
  warnings: string[];
}

export interface ApiErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
