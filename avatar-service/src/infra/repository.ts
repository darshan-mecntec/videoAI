import { Avatar, Voice, AvatarVideo } from '../domain/types';

export interface AvatarRepository {
  findAvatars(userId?: string, orgId?: string): Promise<Avatar[]>;
  findAvatarById(id: string): Promise<Avatar | null>;
  createAvatar(avatar: Avatar): Promise<Avatar>;
  updateAvatar(id: string, updates: Partial<Avatar>): Promise<Avatar | null>;
  deleteAvatar(id: string): Promise<boolean>;

  findVoices(userId?: string): Promise<Voice[]>;
  findVoiceById(id: string): Promise<Voice | null>;
  createVoice(voice: Voice): Promise<Voice>;
  deleteVoice(id: string): Promise<boolean>;

  createAvatarVideo(video: AvatarVideo): Promise<AvatarVideo>;
  findAvatarVideoById(id: string): Promise<AvatarVideo | null>;
  updateAvatarVideo(id: string, updates: Partial<AvatarVideo>): Promise<AvatarVideo | null>;
  listAvatarVideos(userId?: string): Promise<AvatarVideo[]>;
}
