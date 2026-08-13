import { Project, ProjectVersion } from '../domain/types';

export interface ProjectRepository {
  findProjects(orgId: string): Promise<Project[]>;
  findProjectById(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;

  saveVersion(version: ProjectVersion): Promise<ProjectVersion>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();
  private versions: Map<string, ProjectVersion[]> = new Map();

  async findProjects(orgId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.org_id === orgId);
  }

  async findProjectById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async createProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async saveVersion(version: ProjectVersion): Promise<ProjectVersion> {
    const list = this.versions.get(version.project_id) || [];
    list.push(version);
    this.versions.set(version.project_id, list);
    return version;
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    return this.versions.get(projectId) || [];
  }
}
