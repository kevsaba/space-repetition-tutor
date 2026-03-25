/**
 * PDFParserService Tests
 */

import { PDFParseError, PDFParserService } from '../pdf-parser.service';

// Mock pdfjs-dist/legacy/build/pdf.js
jest.mock('pdfjs-dist/legacy/build/pdf.js', () => {
  return {
    getDocument: jest.fn(),
  };
});

describe('PDFParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractPDFText', () => {
    it('should extract text from a buffer', async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');

      // Set up mock text content with proper text items
      const mockTextContent = {
        items: [
          { str: 'Hello World', hasEOL: true },
          { str: 'Test Content', hasEOL: true },
        ],
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      (pdfjs.getDocument as jest.Mock).mockReturnValue({
        promise: Promise.resolve(mockPdfDocument),
      });

      const buffer = Buffer.from('fake pdf content');

      const result = await PDFParserService.extractPDFText(buffer);

      expect(result).toContain('Hello World');
      expect(result).toContain('Test Content');
      expect(pdfjs.getDocument).toHaveBeenCalled();
    });

    it('should throw PDFParseError on extraction failure', async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
      (pdfjs.getDocument as jest.Mock).mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF')),
      });

      const buffer = Buffer.from('invalid pdf');

      await expect(PDFParserService.extractPDFText(buffer)).rejects.toThrow(PDFParseError);
      await expect(PDFParserService.extractPDFText(buffer)).rejects.toMatchObject({
        code: 'PDF_EXTRACTION_FAILED',
      });
    });
  });

  describe('parsePDFStructure', () => {
    it('should parse topics and numbered questions', async () => {
      const text = `
Java Concurrency

1. What is a thread in Java?
2. Explain the difference between process and thread.
3. What is the purpose of the synchronized keyword?

REST API Design

1. What are RESTful principles?
2. Explain HTTP methods and their usage.
      `;

      const result = await PDFParserService.parsePDFStructure(text);

      expect(result.topics).toHaveLength(2);
      expect(result.topics[0].name).toBe('Java Concurrency');
      expect(result.topics[0].questions).toHaveLength(3);
      expect(result.topics[1].name).toBe('REST API Design');
      expect(result.topics[1].questions).toHaveLength(2);
    });

    it('should parse questions with different numbering formats', async () => {
      const text = `
Java Concurrency

1. What is a thread?
2) Explain synchronization.
3 - Describe deadlock.
Q4. What is a volatile variable?
      `;

      const result = await PDFParserService.parsePDFStructure(text);

      expect(result.topics).toHaveLength(1);
      expect(result.topics[0].questions).toHaveLength(4);
    });

    it('should throw error for empty PDF', async () => {
      await expect(PDFParserService.parsePDFStructure('')).rejects.toThrow(PDFParseError);
      await expect(PDFParserService.parsePDFStructure('')).rejects.toMatchObject({
        code: 'PDF_EMPTY',
      });
    });

    it('should throw error when no topics found', async () => {
      const text = 'Some random text without topics';

      await expect(PDFParserService.parsePDFStructure(text)).rejects.toThrow(PDFParseError);
      await expect(PDFParserService.parsePDFStructure(text)).rejects.toMatchObject({
        code: 'PDF_NO_TOPICS',
      });
    });

    it('should handle multi-line questions', async () => {
      const text = `
Java Concurrency

1. What is a thread in Java? A thread is a lightweight process.
2. Explain synchronization in detail.
      `;

      const result = await PDFParserService.parsePDFStructure(text);

      expect(result.topics).toHaveLength(1);
      expect(result.topics[0].questions[0].content).toContain('lightweight process');
    });

    it('should identify topic headlines with keywords', async () => {
      const text = `
Database Design

1. What is normalization?
2. Explain ACID properties.
      `;

      const result = await PDFParserService.parsePDFStructure(text);

      expect(result.topics).toHaveLength(1);
      expect(result.topics[0].name).toBe('Database Design');
    });
  });

  describe('parsePDF (integration)', () => {
    it('should parse PDF file from buffer', async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');

      // Mock text content that simulates a PDF with proper line breaks
      // In pdfjs-dist, text items with hasEOL: true should result in line breaks
      const mockTextContent = {
        items: [
          { str: 'Java Concurrency\n\n1. What is a thread?', hasEOL: false },
        ],
      };

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue(mockTextContent),
      };

      const mockPdfDocument = {
        numPages: 1,
        getPage: jest.fn().mockResolvedValue(mockPage),
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      (pdfjs.getDocument as jest.Mock).mockReturnValue({
        promise: Promise.resolve(mockPdfDocument),
      });

      const buffer = Buffer.from('fake pdf');
      const result = await PDFParserService.parsePDF(buffer);

      expect(result.topics).toHaveLength(1);
      expect(result.topics[0].name).toBe('Java Concurrency');
      expect(result.topics[0].questions).toHaveLength(1);
    });
  });
});
