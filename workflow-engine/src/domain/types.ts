export type WorkflowRunStatus =
  | 'created'
  | 'validated'
  | 'queued'
  | 'running'
  | 'partially_completed'
  | 'completed'
  | 'failed';

export interface WorkflowNodePort {
  name: string;
  type: 'string' | 'image' | 'video' | 'audio' | 'json';
}

export interface WorkflowNode {
  id: string;
  name: string;
  node_type: string;
  capability_type?: string;
  params: Record<string, unknown>;
  inputs: WorkflowNodePort[];
  outputs: WorkflowNodePort[];
}

export interface WorkflowEdge {
  id: string;
  source_node_id: string;
  source_output: string;
  target_node_id: string;
  target_input: string;
}

export interface WorkflowDefinition {
  id: string;
  project_id: string;
  name: string;
  description: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
}

export interface ExecutionStage {
  stage_index: number;
  node_ids: string[];
}

export interface ExecutionPlan {
  workflow_id: string;
  workflow_version: number;
  stages: ExecutionStage[];
  topological_order: string[];
}

export interface WorkflowStepState {
  step_id: string;
  node_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  selected_provider_id?: string;
  selected_model_id?: string;
  output_ref?: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowRunInstance {
  run_id: string;
  workflow_id: string;
  workflow_version: number;
  project_id: string;
  user_id: string;
  status: WorkflowRunStatus;
  execution_plan: ExecutionPlan;
  steps: Record<string, WorkflowStepState>;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
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
