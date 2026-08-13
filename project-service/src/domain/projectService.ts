import { v4 as uuidv4 } from 'uuid';
import { Project, CreateProjectInput, AppError } from './types';
import { ProjectRepository } from '../infra/repository';

export class ProjectService {
  constructor(private repo: ProjectRepository) {}

  async seedStarterProjects(): Promise<void> {
    const existing = await this.repo.findProjects('org-cybertech-1');
    if (existing.length > 0) return;

    const now = new Date().toISOString();

    const starterProjects: Project[] = [
      {
        id: 'proj-cyber-marketing-1',
        org_id: 'org-cybertech-1',
        name: 'CyberTech Q3 Video Campaign',
        description: 'AI generated video teasers and promo spots for Q3 launch',
        is_default: true,
        member_count: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'proj-ecom-ad-suite-2',
        org_id: 'org-cybertech-1',
        name: 'E-Commerce 4K Product Ads',
        description: 'Product photo rendering and ESRGAN upscaling',
        is_default: false,
        member_count: 3,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const proj of starterProjects) {
      await this.repo.createProject(proj);
    }
  }

  async listProjects(orgId: string): Promise<Project[]> {
    return this.repo.findProjects(orgId);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.repo.findProjectById(id);
    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', `Project '${id}' not found`);
    }
    return project;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    if (!input.name) {
      throw new AppError(400, 'INVALID_INPUT', 'Project name is required');
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: `proj-${uuidv4().substring(0, 8)}`,
      org_id: input.org_id || 'org-cybertech-1',
      name: input.name,
      description: input.description || '',
      is_default: input.is_default || false,
      member_count: 1,
      created_at: now,
      updated_at: now,
    };

    return this.repo.createProject(project);
  }

  async listVersions(projectId: string) {
    await this.getProjectById(projectId);
    return this.repo.listVersions(projectId);
  }

  async saveVersion(projectId: string, assetUrl: string, snapshotNote?: string) {
    await this.getProjectById(projectId);
    const existing = await this.repo.listVersions(projectId);
    const versionNum = existing.length + 1;
    const now = new Date().toISOString();

    const version = {
      id: `ver-${uuidv4().substring(0, 8)}`,
      project_id: projectId,
      version_number: versionNum,
      asset_url: assetUrl,
      snapshot_note: snapshotNote || `Version ${versionNum} Snapshot`,
      created_at: now,
    };
    return this.repo.saveVersion(version);
  }

  async restoreVersion(projectId: string, versionId: string) {
    const versions = await this.listVersions(projectId);
    const target = versions.find(v => v.id === versionId);
    if (!target) {
      throw new AppError(404, 'VERSION_NOT_FOUND', `Version '${versionId}' not found in project '${projectId}'`);
    }
    // Save restored version as a new current version snapshot
    return this.saveVersion(projectId, target.asset_url, `Restored from Version ${target.version_number}`);
  }
}
