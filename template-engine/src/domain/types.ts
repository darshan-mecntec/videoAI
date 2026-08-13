export type TemplateCategory = 'marketing' | 'ecommerce' | 'social_video' | 'voiceover' | 'avatar';

export interface PromptVariable {
  name: string;
  label: string;
  default_value?: string;
  required: boolean;
}

export interface WorkflowTemplateNode {
  id: string;
  name: string;
  node_type: string;
  capability_type?: string;
  params: Record<string, unknown>;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
}

export interface WorkflowTemplateEdge {
  id: string;
  source_node_id: string;
  source_output: string;
  target_node_id: string;
  target_input: string;
}

export interface WorkflowTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  modalities: string[];
  thumbnail_url?: string;
  version: number;
  variables: PromptVariable[];
  nodes: WorkflowTemplateNode[];
  edges: WorkflowTemplateEdge[];
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptRenderRequest {
  template_text: string;
  variables?: Record<string, string | number>;
}

export interface PromptRenderResult {
  rendered_text: string;
  estimated_tokens: number;
  variables_used: string[];
  missing_variables: string[];
}

export interface PromptLintRequest {
  prompt: string;
  max_tokens?: number;
  banned_words?: string[];
}

export interface PromptLintResult {
  is_valid: boolean;
  estimated_tokens: number;
  warnings: string[];
  banned_words_found: string[];
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
