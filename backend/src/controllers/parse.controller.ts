import { Request, Response } from 'express';
import { pdfService } from '../services/pdf.service';
import { workerService } from '../services/worker.service';
import { mergeService } from '../services/merge.service';
import prisma from '../db/client';
import { FitnessPlanFields } from '../types/fitnessPlan';

export class ParseController {
  async parsePdf(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const fileBuffer = req.file.buffer;
      const filename = req.file.originalname;

      console.log(`[Parse Controller] Starting parse for: ${filename}`);

      // Create initial database record
      const parsedPlan = await prisma.parsedPlan.create({
        data: {
          sourceFilename: filename,
          pagesCount: 0,
          status: 'processing',
          rawJson: '{}',
          debugJson: '{}',
        },
      });

      const planId = parsedPlan.id;

      try {
        // Step 1: Split PDF into pages
        console.log('[Parse Controller] Step 1: Splitting PDF...');
        const pages = await pdfService.splitPdf(fileBuffer);

        // Update page count
        await prisma.parsedPlan.update({
          where: { id: planId },
          data: { pagesCount: pages.length },
        });

        // Step 2: Send each page to worker
        console.log('[Parse Controller] Step 2: Sending pages to worker...');
        const pageResults = await workerService.parseAllPages(pages);

        // Step 3: Merge results
        console.log('[Parse Controller] Step 3: Merging results...');
        const mergedResult = mergeService.mergePageResults(pageResults);

        // Extract metadata for quick access
        const fitnessDomain = mergedResult.domains.find((d) => d.type === 'fitness_plan');
        const fitnessFields = fitnessDomain?.fields as FitnessPlanFields | undefined;

        const metaTitle = fitnessFields?.meta?.plan_name || null;
        const metaCoachName = fitnessFields?.meta?.coach_name || null;
        const metaDurationWeeks = fitnessFields?.meta?.duration_weeks || null;

        // Prepare debug JSON (just page summaries for now)
        const debugJson = {
          page_summaries: fitnessFields?.debug?.page_summaries || [],
        };

        // Step 4: Save to database
        console.log('[Parse Controller] Step 4: Saving to database...');
        const updatedPlan = await prisma.parsedPlan.update({
          where: { id: planId },
          data: {
            status: 'completed',
            rawJson: JSON.stringify(mergedResult),
            debugJson: JSON.stringify(debugJson),
            metaTitle,
            metaCoachName,
            metaDurationWeeks,
          },
        });

        console.log(`[Parse Controller] Successfully completed parse for plan ${planId}`);

        res.status(200).json({
          planId: updatedPlan.id,
          status: updatedPlan.status,
          meta: {
            title: metaTitle,
            coachName: metaCoachName,
            durationWeeks: metaDurationWeeks,
          },
          pagesCount: updatedPlan.pagesCount,
          createdAt: updatedPlan.createdAt,
        });
      } catch (processingError) {
        // Mark as failed
        await prisma.parsedPlan.update({
          where: { id: planId },
          data: {
            status: 'failed',
            debugJson: JSON.stringify({
              error: processingError instanceof Error ? processingError.message : 'Unknown error',
            }),
          },
        });

        throw processingError;
      }
    } catch (error) {
      console.error('[Parse Controller] Error:', error);
      res.status(500).json({
        error: 'Failed to parse PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const parseController = new ParseController();
