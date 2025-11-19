import { Request, Response } from 'express';
import { pdfService } from '../services/pdf.service';
import { workerService } from '../services/worker.service';
import { mergeService } from '../services/merge.service';
import { db, generateId } from '../db/sqlite-client';
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
      const planId = generateId();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO ParsedPlan (id, createdAt, updatedAt, sourceFilename, pagesCount, status, rawJson, debugJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(planId, now, now, filename, 0, 'processing', '{}', '{}');

      try {
        // Step 1: Split PDF into pages
        console.log('[Parse Controller] Step 1: Splitting PDF...');
        const pages = await pdfService.splitPdf(fileBuffer);

        // Update page count
        db.prepare(`
          UPDATE ParsedPlan SET pagesCount = ?, updatedAt = ? WHERE id = ?
        `).run(pages.length, new Date().toISOString(), planId);

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
        const updatedAt = new Date().toISOString();

        db.prepare(`
          UPDATE ParsedPlan
          SET status = ?, rawJson = ?, debugJson = ?, metaTitle = ?, metaCoachName = ?, metaDurationWeeks = ?, updatedAt = ?
          WHERE id = ?
        `).run('completed', JSON.stringify(mergedResult), JSON.stringify(debugJson), metaTitle, metaCoachName, metaDurationWeeks, updatedAt, planId);

        const updatedPlan = db.prepare('SELECT * FROM ParsedPlan WHERE id = ?').get(planId) as any;

        console.log(`[Parse Controller] Successfully completed parse for plan ${planId}`);

        // Return the full merged UniversalEnvelope for the app to consume
        res.status(200).json(mergedResult);
      } catch (processingError) {
        // Mark as failed
        db.prepare(`
          UPDATE ParsedPlan
          SET status = ?, debugJson = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          'failed',
          JSON.stringify({
            error: processingError instanceof Error ? processingError.message : 'Unknown error',
          }),
          new Date().toISOString(),
          planId
        );

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
