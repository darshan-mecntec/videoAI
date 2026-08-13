import { Router, Request, Response, NextFunction } from 'express';
import { ProjectService } from '../domain/projectService';

export function createRouter(projectService: ProjectService): Router {
  const router = Router();

  // GET /v1/projects
  router.get('/v1/projects', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || 'org-cybertech-1';
      const projects = await projectService.listProjects(orgId);
      res.status(200).json({ projects });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/projects/:id
  router.get('/v1/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.id);
      res.status(200).json({ project });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/projects
  router.post('/v1/projects', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.createProject(req.body);
      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/projects/:id/versions
  router.get('/v1/projects/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await projectService.listVersions(req.params.id);
      res.status(200).json({ versions });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/projects/:id/versions
  router.post('/v1/projects/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { asset_url, snapshot_note } = req.body;
      const version = await projectService.saveVersion(req.params.id, asset_url, snapshot_note);
      res.status(201).json({ version });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/projects/:id/versions/:vid/restore
  router.patch('/v1/projects/:id/versions/:vid/restore', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const version = await projectService.restoreVersion(req.params.id, req.params.vid);
      res.status(200).json({ version });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
