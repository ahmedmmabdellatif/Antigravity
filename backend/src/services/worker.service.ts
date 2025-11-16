import axios from 'axios';
import { config } from '../config/env';
import { PageParseRequest, PageParseResponse } from '../types/fitnessPlan';

export class WorkerService {
  private workerUrl: string;

  constructor() {
    this.workerUrl = config.WORKER_URL;
  }

  async parsePageWithWorker(
    pageNumber: number,
    imageBase64: string | null,
    text: string
  ): Promise<PageParseResponse> {
    try {
      console.log(`[Worker Service] Sending page ${pageNumber} to worker...`);

      const requestBody: PageParseRequest = {
        page_number: pageNumber,
        image_base64: imageBase64,
        text,
      };

      const response = await axios.post<PageParseResponse>(
        this.workerUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minute timeout for OpenAI processing
        }
      );

      if (!response.data || !response.data.domains) {
        throw new Error('Invalid response from worker: missing domains array');
      }

      console.log(`[Worker Service] Successfully parsed page ${pageNumber}`);
      return response.data;
    } catch (error) {
      console.error(`[Worker Service] Error parsing page ${pageNumber}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(
            `Worker API error (${error.response.status}): ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('Worker API did not respond. Check WORKER_URL and network connectivity.');
        }
      }

      throw new Error(
        `Failed to parse page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseAllPages(
    pages: Array<{ pageNumber: number; imageBase64: string | null; text: string }>
  ): Promise<PageParseResponse[]> {
    const results: PageParseResponse[] = [];

    for (const page of pages) {
      const result = await this.parsePageWithWorker(
        page.pageNumber,
        page.imageBase64,
        page.text
      );
      results.push(result);
    }

    console.log(`[Worker Service] Completed parsing ${pages.length} pages`);
    return results;
  }
}

export const workerService = new WorkerService();
