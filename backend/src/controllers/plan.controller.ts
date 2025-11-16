import { Request, Response } from 'express';
import prisma from '../db/client';

export class PlanController {
  async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await prisma.parsedPlan.findMany({
        select: {
          id: true,
          createdAt: true,
          sourceFilename: true,
          status: true,
          metaTitle: true,
          metaCoachName: true,
          metaDurationWeeks: true,
          pagesCount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        plans,
        count: plans.length,
      });
    } catch (error) {
      console.error('[Plan Controller] Error listing plans:', error);
      res.status(500).json({
        error: 'Failed to list plans',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPlanById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const plan = await prisma.parsedPlan.findUnique({
        where: { id },
        include: {
          mediaAssets: true,
        },
      });

      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }

      // Parse JSON strings back to objects
      const rawJson = JSON.parse(plan.rawJson);
      const debugJson = JSON.parse(plan.debugJson);

      res.status(200).json({
        id: plan.id,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        sourceFilename: plan.sourceFilename,
        pagesCount: plan.pagesCount,
        status: plan.status,
        meta: {
          title: plan.metaTitle,
          coachName: plan.metaCoachName,
          durationWeeks: plan.metaDurationWeeks,
        },
        data: rawJson,
        debug: debugJson,
        mediaAssets: plan.mediaAssets,
      });
    } catch (error) {
      console.error('[Plan Controller] Error fetching plan:', error);
      res.status(500).json({
        error: 'Failed to fetch plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPlanDebug(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const plan = await prisma.parsedPlan.findUnique({
        where: { id },
        select: {
          id: true,
          sourceFilename: true,
          pagesCount: true,
          debugJson: true,
        },
      });

      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }

      const debugJson = JSON.parse(plan.debugJson);

      res.status(200).json({
        id: plan.id,
        sourceFilename: plan.sourceFilename,
        pagesCount: plan.pagesCount,
        debug: debugJson,
      });
    } catch (error) {
      console.error('[Plan Controller] Error fetching plan debug:', error);
      res.status(500).json({
        error: 'Failed to fetch plan debug data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const planController = new PlanController();
