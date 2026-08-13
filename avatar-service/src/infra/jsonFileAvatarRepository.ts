import fs from 'fs';
import path from 'path';
import { Avatar, Voice, AvatarVideo } from '../domain/types';
import { AvatarRepository } from './repository';

interface StorageSchema {
  avatars: Record<string, Avatar>;
  voices: Record<string, Voice>;
  avatar_videos: Record<string, AvatarVideo>;
}

export class JsonFileAvatarRepository implements AvatarRepository {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(__dirname, '../../data/avatars_store.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      const initial: StorageSchema = { avatars: {}, voices: {}, avatar_videos: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private readData(): StorageSchema {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as StorageSchema;
    } catch (_) {
      return { avatars: {}, voices: {}, avatar_videos: {} };
    }
  }

  private writeData(data: StorageSchema): void {
    this.ensureFileExists();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async findAvatars(userId?: string): Promise<Avatar[]> {
    const data = this.readData();
    const list = Object.values(data.avatars);
    return list.filter((a) => a.is_system || (userId && a.user_id === userId));
  }

  async findAvatarById(id: string): Promise<Avatar | null> {
    const data = this.readData();
    return data.avatars[id] || null;
  }

  async createAvatar(avatar: Avatar): Promise<Avatar> {
    const data = this.readData();
    data.avatars[avatar.id] = avatar;
    this.writeData(data);
    return avatar;
  }

  async updateAvatar(id: string, updates: Partial<Avatar>): Promise<Avatar | null> {
    const data = this.readData();
    if (!data.avatars[id]) return null;
    data.avatars[id] = { ...data.avatars[id], ...updates, updated_at: new Date().toISOString() };
    this.writeData(data);
    return data.avatars[id];
  }

  async deleteAvatar(id: string): Promise<boolean> {
    const data = this.readData();
    if (data.avatars[id]) {
      delete data.avatars[id];
      this.writeData(data);
      return true;
    }
    return false;
  }

  async findVoices(userId?: string): Promise<Voice[]> {
    const data = this.readData();
    const list = Object.values(data.voices);
    return list.filter((v) => v.is_system || (userId && v.user_id === userId));
  }

  async findVoiceById(id: string): Promise<Voice | null> {
    const data = this.readData();
    return data.voices[id] || null;
  }

  async createVoice(voice: Voice): Promise<Voice> {
    const data = this.readData();
    data.voices[voice.id] = voice;
    this.writeData(data);
    return voice;
  }

  async deleteVoice(id: string): Promise<boolean> {
    const data = this.readData();
    if (data.voices[id]) {
      delete data.voices[id];
      this.writeData(data);
      return true;
    }
    return false;
  }

  async createAvatarVideo(video: AvatarVideo): Promise<AvatarVideo> {
    const data = this.readData();
    data.avatar_videos[video.id] = video;
    this.writeData(data);
    return video;
  }

  async findAvatarVideoById(id: string): Promise<AvatarVideo | null> {
    const data = this.readData();
    return data.avatar_videos[id] || null;
  }

  async updateAvatarVideo(id: string, updates: Partial<AvatarVideo>): Promise<AvatarVideo | null> {
    const data = this.readData();
    if (!data.avatar_videos[id]) return null;
    data.avatar_videos[id] = { ...data.avatar_videos[id], ...updates };
    this.writeData(data);
    return data.avatar_videos[id];
  }

  async listAvatarVideos(userId?: string): Promise<AvatarVideo[]> {
    const data = this.readData();
    const list = Object.values(data.avatar_videos);
    if (userId) return list.filter((v) => v.user_id === userId);
    return list;
  }
}
