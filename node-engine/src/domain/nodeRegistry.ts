import { NodeTypeDefinition, AppError } from './types';
import { NodeRepository } from '../infra/repository';

export class NodeRegistryService {
  constructor(private repo: NodeRepository) {}

  async seedDefaultNodes(): Promise<void> {
    const existing = await this.repo.findNodes();
    if (existing.length > 0) return;

    const defaultNodes: NodeTypeDefinition[] = [
      {
        id: 'node-text-to-image',
        type: 'text-to-image',
        category: 'generation',
        name: 'Text to Image Node',
        description: 'Generates static imagery from natural language prompts.',
        icon: 'image',
        capability_type: 'text-to-image',
        inputs: [
          { name: 'prompt', label: 'Prompt Text', type: 'string', required: true, description: 'Positive generation prompt' },
          { name: 'negative_prompt', label: 'Negative Prompt', type: 'string', required: false, description: 'Unwanted concepts to avoid' },
        ],
        outputs: [
          { name: 'image', label: 'Generated Image', type: 'image', required: true },
        ],
        params: [
          { name: 'quality', label: 'Quality', type: 'select', default_value: 'standard', options: ['standard', 'hd'], required: false },
          { name: 'size', label: 'Aspect Ratio / Size', type: 'select', default_value: '1024x1024', options: ['1024x1024', '1792x1024', '1024x1792'], required: false },
        ],
      },
      {
        id: 'node-text-to-video',
        type: 'text-to-video',
        category: 'generation',
        name: 'Text to Video Node',
        description: 'Renders motion video clips from text script prompts.',
        icon: 'video',
        capability_type: 'text-to-video',
        inputs: [
          { name: 'prompt', label: 'Video Script Prompt', type: 'string', required: true },
        ],
        outputs: [
          { name: 'video', label: 'Rendered Video', type: 'video', required: true },
        ],
        params: [
          { name: 'duration_sec', label: 'Duration (sec)', type: 'number', default_value: 5, required: false },
          { name: 'fps', label: 'Framerate (FPS)', type: 'number', default_value: 30, required: false },
        ],
      },
      {
        id: 'node-text-to-audio',
        type: 'text-to-audio',
        category: 'generation',
        name: 'Text to Audio Node',
        description: 'Synthesizes spoken narration or audio soundscapes.',
        icon: 'audio',
        capability_type: 'text-to-audio',
        inputs: [
          { name: 'text', label: 'Script Text', type: 'string', required: true },
        ],
        outputs: [
          { name: 'audio', label: 'Generated Audio', type: 'audio', required: true },
        ],
        params: [
          { name: 'voice', label: 'Voice Profile', type: 'select', default_value: 'alloy', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], required: false },
        ],
      },
      {
        id: 'node-voice-clone',
        type: 'voice-clone',
        category: 'generation',
        name: 'Voice Cloning Node',
        description: 'Clones target voice timbre from audio sample input.',
        icon: 'mic',
        capability_type: 'voice-clone',
        inputs: [
          { name: 'audio_sample', label: 'Reference Audio Sample', type: 'audio', required: true },
        ],
        outputs: [
          { name: 'audio', label: 'Cloned Audio Output', type: 'audio', required: true },
        ],
        params: [
          { name: 'stability', label: 'Voice Stability', type: 'number', default_value: 0.75, required: false },
        ],
      },
      {
        id: 'node-avatar-lipsync',
        type: 'avatar-lipsync',
        category: 'generation',
        name: 'Avatar Lipsync Node',
        description: 'Syncs facial lips of presenter avatar image to voiceover audio.',
        icon: 'user-video',
        capability_type: 'avatar-lipsync',
        inputs: [
          { name: 'audio', label: 'Voiceover Audio', type: 'audio', required: true },
          { name: 'image', label: 'Presenter Portrait Image', type: 'image', required: true },
        ],
        outputs: [
          { name: 'video', label: 'Lipsynced Video Output', type: 'video', required: true },
        ],
        params: [
          { name: 'expression', label: 'Facial Expression', type: 'select', default_value: 'neutral', options: ['neutral', 'smiling', 'serious'], required: false },
        ],
      },
      {
        id: 'node-inpainting',
        type: 'inpainting',
        category: 'processing',
        name: 'Inpainting Node',
        description: 'Edits image region defined by mask image & prompt.',
        icon: 'edit',
        capability_type: 'inpainting',
        inputs: [
          { name: 'image', label: 'Original Image', type: 'image', required: true },
          { name: 'mask', label: 'Inpaint Mask Image', type: 'image', required: true },
          { name: 'prompt', label: 'Inpaint Replacement Prompt', type: 'string', required: true },
        ],
        outputs: [
          { name: 'image', label: 'Inpainted Image Output', type: 'image', required: true },
        ],
        params: [
          { name: 'mask_blur', label: 'Mask Blur (px)', type: 'number', default_value: 4, required: false },
        ],
      },
      {
        id: 'node-upscale',
        type: 'upscale',
        category: 'processing',
        name: '4K Upscaler Node',
        description: 'Enhances resolution and restores details of input image.',
        icon: 'maximize',
        capability_type: 'upscale',
        inputs: [
          { name: 'image', label: 'Input Image', type: 'image', required: true },
        ],
        outputs: [
          { name: 'image', label: 'Upscaled Image Output', type: 'image', required: true },
        ],
        params: [
          { name: 'scale', label: 'Upscale Multiplier', type: 'number', default_value: 4, required: false },
        ],
      },
      {
        id: 'node-prompt-template',
        type: 'prompt-template',
        category: 'utility',
        name: 'Prompt Template Node',
        description: 'Formats variable placeholder strings for downstream AI generators.',
        icon: 'file-text',
        inputs: [],
        outputs: [
          { name: 'text', label: 'Formatted Prompt Text', type: 'string', required: true },
        ],
        params: [
          { name: 'text', label: 'Prompt Template Text', type: 'string', default_value: 'A high quality scene of {{topic}}', required: true },
        ],
      },
    ];

    for (const node of defaultNodes) {
      await this.repo.createNode(node);
    }
  }

  async listNodes(options?: { category?: string }): Promise<NodeTypeDefinition[]> {
    return this.repo.findNodes(options);
  }

  async getNodeByType(type: string): Promise<NodeTypeDefinition> {
    const node = await this.repo.findNodeByType(type);
    if (!node) {
      throw new AppError(404, 'NODE_NOT_FOUND', `Node type '${type}' not found in registry`);
    }
    return node;
  }

  async registerNode(node: NodeTypeDefinition): Promise<NodeTypeDefinition> {
    if (!node.type || !node.name) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: type, name');
    }
    const existing = await this.repo.findNodeByType(node.type);
    if (existing) {
      throw new AppError(409, 'NODE_ALREADY_EXISTS', `Node type '${node.type}' already exists`);
    }
    return this.repo.createNode(node);
  }
}
