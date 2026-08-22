import { Router, Request, Response } from 'express';
import { dbService } from '../db.ts';

export const appRouter = Router();

/**
 * GET /api/v1/app/version
 * Public endpoint queried by ECLPISE DUMP Android client to verify version requirement
 */
appRouter.get('/version', async (_req: Request, res: Response) => {
  try {
    const versionConfig = await dbService.getAppVersion();
    return res.json({
      latest_version: versionConfig.latest_version,
      minimum_version: versionConfig.minimum_version,
      update_required: versionConfig.update_required,
      download_url: versionConfig.download_url,
      changelog: versionConfig.changelog,
    });
  } catch (err) {
    return res.status(500).json({
      latest_version: '1.0.0',
      minimum_version: '1.0.0',
      update_required: false,
      download_url: '',
    });
  }
});
