import pdfParse from 'pdf-parse';

interface PageData {
  pageNumber: number;
  imageBase64: string | null;
  text: string;
}

export class PdfService {
  async splitPdf(fileBuffer: Buffer): Promise<PageData[]> {
    try {
      const data = await pdfParse(fileBuffer);
      const numPages = data.numpages;
      const allText = data.text;

      const pages: PageData[] = [];

      // Split text by page breaks (rough estimation)
      const avgCharsPerPage = Math.ceil(allText.length / numPages);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const startIdx = (pageNum - 1) * avgCharsPerPage;
        const endIdx = Math.min(pageNum * avgCharsPerPage, allText.length);
        const pageText = allText.substring(startIdx, endIdx).trim();

        pages.push({
          pageNumber: pageNum,
          imageBase64: null, // No image rendering in this version
          text: pageText || `[Page ${pageNum} - No text extracted]`,
        });

        console.log(`[PDF Service] Processed page ${pageNum}/${numPages}`);
      }

      console.log(`[PDF Service] Successfully split PDF into ${numPages} pages`);
      return pages;
    } catch (error) {
      console.error('[PDF Service] Error splitting PDF:', error);
      throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const pdfService = new PdfService();
