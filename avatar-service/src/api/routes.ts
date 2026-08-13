import { Router, Response, NextFunction } from 'express';
import { AvatarService } from '../domain/avatarService';
import { createAuthMiddleware, requirePermission, AuthRequest } from './middleware';

export function createRouter(avatarService: AvatarService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware();

  // GET /v1/avatars — List system & user avatars
  router.get('/v1/avatars', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub;
      const orgId = req.userToken?.org_id;
      const avatars = await avatarService.listAvatars(userId, orgId);
      res.status(200).json({ success: true, avatars });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/avatars — Create a new avatar (Real Clone, Virtual AI, Photo Avatar)
  router.post('/v1/avatars', authMiddleware, requirePermission('video:generate'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-1c94e86b';
      const orgId = req.userToken?.org_id || 'org-main-1';
      const isSuperAdmin = req.userToken?.role === 'super_admin';

      const avatar = await avatarService.createAvatar({
        ...req.body,
        user_id: userId,
        org_id: orgId,
        is_system: req.body.is_system && isSuperAdmin,
      });

      res.status(201).json({ success: true, avatar });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/avatars/:id — Delete avatar
  router.delete('/v1/avatars/:id', authMiddleware, requirePermission('video:generate'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-1c94e86b';
      const isSuperAdmin = req.userToken?.role === 'super_admin';
      const deleted = await avatarService.deleteAvatar(req.params.id, userId, isSuperAdmin);
      res.status(200).json({ success: deleted });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/voices — List voices (Public Library + Custom User Clones)
  router.get('/v1/voices', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub;
      const voices = await avatarService.listVoices(userId);
      res.status(200).json({ success: true, voices });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/voices — Clone / Create voice
  router.post('/v1/voices', authMiddleware, requirePermission('video:generate'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-1c94e86b';
      const isSuperAdmin = req.userToken?.role === 'super_admin';
      const voice = await avatarService.createVoice(req.body, userId, isSuperAdmin);
      res.status(201).json({ success: true, voice });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/voices/:id — Delete custom voice
  router.delete('/v1/voices/:id', authMiddleware, requirePermission('video:generate'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-1c94e86b';
      const isSuperAdmin = req.userToken?.role === 'super_admin';
      const deleted = await avatarService.deleteVoice(req.params.id, userId, isSuperAdmin);
      res.status(200).json({ success: deleted });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/avatar-videos — Generate video with model quality selection & credit deduction
  router.post('/v1/avatar-videos', authMiddleware, requirePermission('video:generate'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-guest-1';
      const orgId = req.userToken?.org_id || 'org-main-1';

      const video = await avatarService.generateAvatarVideo({
        ...req.body,
        user_id: userId,
        org_id: orgId,
      });

      res.status(201).json({ success: true, video });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/avatar-videos/:id — Poll generation status
  router.get('/v1/avatar-videos/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const video = await avatarService.getAvatarVideoStatus(req.params.id);
      res.status(200).json({ success: true, video });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/avatar-videos — List all generated videos for current user
  router.get('/v1/avatar-videos', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub;
      const videos = await avatarService.listAvatarVideos(userId);
      res.status(200).json({ success: true, videos });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
