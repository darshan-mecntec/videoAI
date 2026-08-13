import { v4 as uuidv4 } from 'uuid';
import { DispatchExecutionRequest, DispatchExecutionResult, AppError } from './types';

export class ExecutionService {
  async dispatchExecution(req: DispatchExecutionRequest): Promise<DispatchExecutionResult> {
    if (!req.capability_type) {
      throw new AppError(400, 'INVALID_INPUT', 'Field capability_type is required');
    }

    const provider = req.provider_id || `provider-${req.capability_type}`;
    const model = req.model_id || `${req.capability_type}-v1`;

    const cap = req.capability_type;

    let outputType: 'video' | 'image' | 'audio' = 'image';
    let url = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200';
    let thumbnailUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    let resolution = '1024x1024';
    let durationSec: number | undefined = undefined;

    if (cap === 'text-to-video' || cap === 'avatar-lipsync') {
      outputType = 'video';
      url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      thumbnailUrl = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=500';
      resolution = '1920x1080';
      durationSec = 15;
    } else if (cap === 'text-to-audio' || cap === 'voice-clone') {
      outputType = 'audio';
      url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      durationSec = 30;
    } else if (cap === 'upscale') {
      outputType = 'image';
      url = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600';
      resolution = '3840x2160';
    }

    const promptText = (req.params?.text as string) || (req.inputs?.prompt as string) || 'AI generated creative asset';
    const assetName = `${req.capability_type.toUpperCase()} Generated Asset (${new Date().toLocaleTimeString()})`;

    return {
      execution_id: `exec-${uuidv4()}`,
      status: 'succeeded',
      provider_used: provider,
      model_used: model,
      capability_type: req.capability_type,
      output_asset: {
        name: assetName,
        type: outputType,
        url,
        thumbnail_url: thumbnailUrl,
        resolution,
        duration_sec: durationSec,
      },
      metrics: {
        latency_ms: Math.floor(Math.random() * 400) + 100,
        cost_usd: 0.02,
        tokens_consumed: 150,
      },
    };
  }
}
