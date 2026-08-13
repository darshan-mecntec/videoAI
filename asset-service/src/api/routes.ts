import { Router, Request, Response, NextFunction } from 'express';
import { AssetService } from '../domain/assetService';
import { AssetType } from '../domain/types';

export function createRouter(assetService: AssetService): Router {
  const router = Router();

  // GET /v1/assets
  router.get('/v1/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as AssetType | undefined;
      const project_id = req.query.project_id as string | undefined;
      const user_id = req.query.user_id as string | undefined;
      const headerOrgId = req.headers['x-org-id'] as string | undefined;
      const org_id = (req.query.org_id as string) || headerOrgId || 'org-cybertech-1';
      const starred = req.query.starred !== undefined ? req.query.starred === 'true' : undefined;

      const assets = await assetService.listAssets({ type, project_id, user_id, org_id, starred });
      res.status(200).json({ assets });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/assets/:id
  router.get('/v1/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.getAssetById(req.params.id);
      res.status(200).json({ asset });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/assets
  router.post('/v1/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.createAsset(req.body);
      res.status(201).json({ asset });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/assets/:id
  router.patch('/v1/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.updateAsset(req.params.id, req.body);
      res.status(200).json({ asset });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/assets/:id
  router.delete('/v1/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assetService.deleteAsset(req.params.id);
      res.status(200).json({ success: true, message: `Asset ${req.params.id} deleted successfully` });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/assets/upload
  router.post('/v1/assets/upload', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename, file_data, type, user_id, org_id } = req.body;
      const asset = await assetService.uploadAsset(filename, file_data, type || 'image', user_id, org_id);
      res.status(201).json({ asset });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
