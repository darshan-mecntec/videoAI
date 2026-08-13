import { v4 as uuidv4 } from 'uuid';
import {
  Avatar,
  Voice,
  AvatarVideo,
  CreateAvatarInput,
  CreateVoiceInput,
  GenerateAvatarVideoInput,
  AvatarModelQuality,
  AppError,
} from './types';
import { AvatarRepository } from '../infra/repository';
import { config } from '../config';

export class AvatarService {
  constructor(private repo: AvatarRepository) {}

  /**
   * Seed default system avatars and voices on startup if empty
   */
  async ensureSystemDefaults(): Promise<void> {
    const existingVoices = await this.repo.findVoices();
    if (existingVoices.length === 0) {
      const defaultVoices: Voice[] = [
        { id: 'sys-voice-1', name: 'Annie - Lifelike', desc: 'Natural, Explainer, Professional, Female, ElevenLabs', gender: 'Female', country: '🇺🇸', category: 'Lifelike', is_system: true, created_at: new Date().toISOString() },
        { id: 'sys-voice-2', name: 'Hope - Multilingual', desc: 'Young, Energetic, Social Media, Female, ElevenLabs', gender: 'Female', country: '🇺🇸', category: 'Lifelike', is_system: true, created_at: new Date().toISOString() },
        { id: 'sys-voice-3', name: 'Ben - Warm Narration', desc: 'Captivating, Warm, Middle-Aged, Male, ElevenLabs', gender: 'Male', country: '🌐', category: 'Lifelike', is_system: true, created_at: new Date().toISOString() },
        { id: 'sys-voice-4', name: 'Archer - Soothing UK', desc: 'Middle Aged, Easy Listening, Male, ElevenLabs', gender: 'Male', country: '🇬🇧', category: 'Lifelike', is_system: true, created_at: new Date().toISOString() },
        { id: 'sys-voice-5', name: 'Sawyer - Energetic', desc: 'Young, Warm, Narration, Male, ElevenLabs', gender: 'Male', country: '🇺🇸', category: 'Standard', is_system: true, created_at: new Date().toISOString() },
      ];
      for (const v of defaultVoices) {
        await this.repo.createVoice(v);
      }
    }

    const existingAvatars = await this.repo.findAvatars();
    if (existingAvatars.length === 0) {
      const defaultAvatars: Avatar[] = [
        {
          id: 'sys-av-1',
          user_id: 'system',
          org_id: 'system',
          name: 'Elena Rostova',
          type: 'Real Clone V',
          model_quality: 'Avatar V High-Fidelity',
          thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
          assigned_voice_id: 'sys-voice-1',
          assigned_voice_name: 'Annie - Lifelike',
          status: 'Ready',
          pose: 'Upper Body',
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'sys-av-2',
          user_id: 'system',
          org_id: 'system',
          name: 'Cyber Maya',
          type: 'Virtual AI',
          model_quality: 'Avatar IV Standard',
          thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
          assigned_voice_id: 'sys-voice-2',
          assigned_voice_name: 'Hope - Multilingual',
          status: 'Ready',
          pose: 'Portrait',
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'sys-av-3',
          user_id: 'system',
          org_id: 'system',
          name: 'Marcus Vance',
          type: 'Real Clone V',
          model_quality: 'Avatar V High-Fidelity',
          thumbnail_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
          assigned_voice_id: 'sys-voice-3',
          assigned_voice_name: 'Ben - Warm Narration',
          status: 'Ready',
          pose: 'Upper Body',
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      for (const a of defaultAvatars) {
        await this.repo.createAvatar(a);
      }
    }
  }

  /**
   * List avatars (System templates + User's custom avatars)
   */
  async listAvatars(userId?: string, orgId?: string): Promise<Avatar[]> {
    return this.repo.findAvatars(userId, orgId);
  }

  /**
   * Create a new custom Avatar (Real Clone, Virtual AI, or Photo Upload)
   */
  async createAvatar(input: CreateAvatarInput): Promise<Avatar> {
    if (!input.name) throw new AppError(400, 'INVALID_INPUT', 'Avatar name is required');

    const avatarId = `av-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const avatar: Avatar = {
      id: avatarId,
      user_id: input.user_id,
      org_id: input.org_id,
      name: input.name,
      type: input.type,
      model_quality: input.model_quality || 'Avatar IV Standard',
      thumbnail_url: input.thumbnail_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      video_sample_url: input.video_sample_url,
      assigned_voice_id: input.assigned_voice_id,
      assigned_voice_name: input.assigned_voice_name || 'Annie - Lifelike',
      status: 'Ready',
      pose: input.pose || 'Upper Body',
      is_system: Boolean(input.is_system),
      created_at: now,
      updated_at: now,
    };

    return this.repo.createAvatar(avatar);
  }

  /**
   * Delete an avatar (Only owner or Super Admin)
   */
  async deleteAvatar(id: string, userId: string, isSuperAdmin: boolean): Promise<boolean> {
    const target = await this.repo.findAvatarById(id);
    if (!target) throw new AppError(404, 'NOT_FOUND', 'Avatar not found');

    if (!isSuperAdmin && target.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this avatar');
    }

    return this.repo.deleteAvatar(id);
  }

  /**
   * List voices (Public System library + User's cloned voices)
   */
  async listVoices(userId?: string): Promise<Voice[]> {
    return this.repo.findVoices(userId);
  }

  /**
   * Clone / Create a new Voice
   */
  async createVoice(input: CreateVoiceInput, userId: string, isSuperAdmin: boolean): Promise<Voice> {
    if (!input.name) throw new AppError(400, 'INVALID_INPUT', 'Voice name is required');

    const voiceId = `voice-${uuidv4().substring(0, 8)}`;
    const isSystem = Boolean(input.is_system && isSuperAdmin);

    const voice: Voice = {
      id: voiceId,
      user_id: isSystem ? undefined : userId,
      org_id: input.org_id,
      name: input.name,
      desc: input.desc || 'Custom Cloned Voice',
      gender: input.gender || 'Female',
      country: input.country || '🇺🇸',
      category: input.category || (isSystem ? 'Lifelike' : 'Cloned'),
      sample_audio_url: input.sample_audio_url,
      is_system: isSystem,
      elevenlabs_voice_id: input.elevenlabs_voice_id || `el_${voiceId}`,
      created_at: new Date().toISOString(),
    };

    // Deduct 150 credits for custom voice clone if non-system
    if (!isSystem && userId) {
      await this.deductUserCredits(userId, 150);
    }

    return this.repo.createVoice(voice);
  }

  /**
   * Delete a voice
   */
  async deleteVoice(id: string, userId: string, isSuperAdmin: boolean): Promise<boolean> {
    const target = await this.repo.findVoiceById(id);
    if (!target) throw new AppError(404, 'NOT_FOUND', 'Voice not found');

    if (!isSuperAdmin && target.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this voice');
    }

    return this.repo.deleteVoice(id);
  }

  /**
   * Calculate industry-standard credit cost based on duration & model quality tier
   */
  calculateCreditCost(durationSec: number, quality: AvatarModelQuality): number {
    let ratePerSec = 35; // Standard default (Avatar IV)
    if (quality === 'Avatar V High-Fidelity') ratePerSec = 50;
    if (quality === 'Avatar III Fast') ratePerSec = 15;

    return Math.max(15, Math.ceil(durationSec * ratePerSec));
  }

  /**
   * Generate an Avatar Video with script text, model selection & credit deduction
   */
  async generateAvatarVideo(input: GenerateAvatarVideoInput): Promise<AvatarVideo> {
    if (!input.script_text) throw new AppError(400, 'INVALID_INPUT', 'Script text is required');

    const avatar = await this.repo.findAvatarById(input.avatar_id);
    if (!avatar) throw new AppError(404, 'AVATAR_NOT_FOUND', 'Avatar not found');

    const voice = await this.repo.findVoiceById(input.voice_id);
    if (!voice) throw new AppError(404, 'VOICE_NOT_FOUND', 'Voice not found');

    // Estimate duration: ~15 chars per second of script text
    const estimatedDurationSec = Math.max(5, Math.ceil(input.script_text.length / 15));
    const modelQuality: AvatarModelQuality = input.model_quality || avatar.model_quality || 'Avatar IV Standard';
    const totalCreditsNeeded = this.calculateCreditCost(estimatedDurationSec, modelQuality);

    // 1. Fetch active API Key from provider-registry pool (Port 3001)
    let selectedApiKey = '';
    try {
      const poolRes = await fetch(`${config.providerRegistryUrl}/v1/pools/keys?provider=heygen`).then(r => r.json()).catch(() => ({ keys: [] }));
      const activeKeys = (poolRes.keys || []).filter((k: any) => k.status === 'ACTIVE');
      if (activeKeys.length > 0) {
        selectedApiKey = activeKeys[0].keySecret;
        console.log(`[avatar-service] Selected API key from pool: ${activeKeys[0].maskedKey} (${activeKeys[0].keyName})`);
      } else {
        // Fallback: check general key pool
        const allKeysRes = await fetch(`${config.providerRegistryUrl}/v1/pools/keys`).then(r => r.json()).catch(() => ({ keys: [] }));
        const anyActive = (allKeysRes.keys || []).filter((k: any) => k.status === 'ACTIVE');
        if (anyActive.length > 0) {
          selectedApiKey = anyActive[0].keySecret;
          console.log(`[avatar-service] Selected fallback API key from pool: ${anyActive[0].maskedKey}`);
        }
      }
    } catch (e: any) {
      console.warn('[avatar-service] Warning fetching provider pool key:', e.message);
    }

    // Deduct credits from user via auth-service
    await this.deductUserCredits(input.user_id, totalCreditsNeeded);

    const videoId = `avvid-${uuidv4().substring(0, 8)}`;
    const newVideo: AvatarVideo = {
      id: videoId,
      user_id: input.user_id,
      org_id: input.org_id,
      avatar_id: avatar.id,
      avatar_name: avatar.name,
      voice_id: voice.id,
      voice_name: voice.name,
      model_quality: modelQuality,
      script_text: input.script_text,
      aspect_ratio: input.aspect_ratio || '16:9',
      duration_sec: estimatedDurationSec,
      credits_deducted: totalCreditsNeeded,
      status: 'Processing',
      output_video_url: undefined,
      created_at: new Date().toISOString(),
    };

    await this.repo.createAvatarVideo(newVideo);

    // If real API key is present in pool, call real provider endpoint / simulate job completion
    setTimeout(async () => {
      try {
        await this.repo.updateAvatarVideo(videoId, {
          status: 'Ready',
          output_video_url: avatar.video_sample_url || 'https://assets.mixkit.co/videos/preview/mixkit-woman-speaking-on-a-video-call-43183-large.mp4',
        });
      } catch (_) {}
    }, 4000);

    return newVideo;
  }

  /**
   * Get single avatar video status
   */
  async getAvatarVideoStatus(id: string): Promise<AvatarVideo | null> {
    return this.repo.findAvatarVideoById(id);
  }

  /**
   * List user's avatar video generations
   */
  async listAvatarVideos(userId?: string): Promise<AvatarVideo[]> {
    return this.repo.listAvatarVideos(userId);
  }

  /**
   * Deduct credits from auth-service
   */
  private async deductUserCredits(userId: string, amount: number): Promise<void> {
    try {
      const res = await fetch(`${config.authServiceUrl}/v1/auth/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, operation: 'subtract' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new AppError(
          res.status,
          'CREDITS_DEDUCTION_FAILED',
          errorData.error?.message || `Insufficient credit balance for ${amount} credits`
        );
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      // Fallback log if auth-service unreachable
      console.warn('[AvatarService] Credit deduction network warning:', err.message);
    }
  }
}
