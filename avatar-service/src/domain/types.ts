export type AvatarType = 'Real Clone V' | 'Virtual AI' | 'Photo Avatar';
export type AvatarModelQuality = 'Avatar V High-Fidelity' | 'Avatar IV Standard' | 'Avatar III Fast';
export type AvatarStatus = 'Training' | 'Ready' | 'Failed';
export type VoiceGender = 'Female' | 'Male' | 'Neutral';
export type VoiceCategory = 'Lifelike' | 'Standard' | 'Cloned';

export interface AvatarLook {
  id: string;
  name: string;
  thumbnail_url: string;
  video_url: string;
  asset_id?: string;
  duration_sec: number; // default 5
  outfit_style: string;
  created_at: string;
}

export interface Avatar {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  type: AvatarType;
  model_quality: AvatarModelQuality;
  thumbnail_url: string;
  video_sample_url?: string;
  assigned_voice_id?: string;
  assigned_voice_name?: string;
  status: AvatarStatus;
  pose: string; // 'Upper Body' | 'Portrait' | 'Full Body'
  looks?: AvatarLook[];
  is_system: boolean; // true = created by Super Admin as default template
  created_at: string;
  updated_at: string;
}

export interface Voice {
  id: string;
  user_id?: string;
  org_id?: string;
  name: string;
  desc: string;
  gender: VoiceGender;
  country: string;
  category: VoiceCategory;
  sample_audio_url?: string;
  is_system: boolean; // true = public library voice; false = user cloned voice
  elevenlabs_voice_id?: string;
  created_at: string;
}

export interface AvatarVideo {
  id: string;
  user_id: string;
  org_id: string;
  avatar_id: string;
  avatar_name: string;
  voice_id: string;
  voice_name: string;
  model_quality: AvatarModelQuality;
  script_text: string;
  aspect_ratio: '16:9' | '9:16' | '1:1';
  duration_sec: number;
  credits_deducted: number;
  output_video_url?: string;
  status: 'Queued' | 'Processing' | 'Ready' | 'Failed';
  created_at: string;
}

export interface CreateAvatarInput {
  user_id: string;
  org_id: string;
  name: string;
  type: AvatarType;
  model_quality?: AvatarModelQuality;
  thumbnail_url?: string;
  video_sample_url?: string;
  assigned_voice_id?: string;
  assigned_voice_name?: string;
  pose?: string;
  is_system?: boolean;
}

export interface CreateVoiceInput {
  user_id?: string;
  org_id?: string;
  name: string;
  desc?: string;
  gender?: VoiceGender;
  country?: string;
  category?: VoiceCategory;
  sample_audio_url?: string;
  is_system?: boolean;
  elevenlabs_voice_id?: string;
}

export interface GenerateAvatarVideoInput {
  user_id: string;
  org_id: string;
  avatar_id: string;
  voice_id: string;
  script_text: string;
  model_quality?: AvatarModelQuality;
  aspect_ratio?: '16:9' | '9:16' | '1:1';
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
