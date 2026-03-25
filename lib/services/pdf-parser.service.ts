/**
 * PDFParserService - Parse PDF Files into Structured Question Data
 *
 * Uses a standalone CLI script to avoid Next.js bundling issues with pdfjs-dist
 *
 * Extracts text from PDF files and parses structure:
 * - Topic headlines (e.g., "Java Concurrency")
 * - Questions listed below each topic as 1., 2., 3., etc.
 *
 * Returns structured data: { topics: [{ name, questions: [{ content, number }] }] }
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Domain error for PDF parsing operations
 */
export class PDFParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PDFParseError';
  }
}

/**
 * Parsed question from PDF
 */
export interface ParsedQuestion {
  content: string;
  number: number;
}

/**
 * Parsed topic from PDF
 */
export interface ParsedTopic {
  name: string;
  questions: ParsedQuestion[];
}

/**
 * Result of PDF parsing
 */
export interface PDFParseResult {
  topics: ParsedTopic[];
}

interface StandaloneResult {
  success: true;
  data: PDFParseResult;
}

interface StandaloneError {
  error: string;
  code: string;
  message: string;
}

/**
 * Save File/Buffer to a temp file and return the path
 */
async function saveToTempFile(file: File | Buffer): Promise<string> {
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  await fs.promises.writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Extract text from PDF using the standalone CLI script
 */
async function extractPDFText(file: File | Buffer): Promise<string> {
  // This function now just calls parsePDF which uses the standalone script
  // The text extraction is done inside the standalone script
  throw new Error('Use parsePDF() instead for the complete parsing workflow');
}

/**
 * Parse PDF text into structured topics and questions
 *
 * @param text - Text extracted from PDF
 * @returns Parsed topics with questions
 */
export async function parsePDFStructure(text: string): Promise<PDFParseResult> {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\d+\s*\n/g, '\n')
    .replace(/\n\s*Page\s+\d+\s*\n/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = normalized.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new PDFParseError(
      'PDF appears to be empty or no text could be extracted',
      'PDF_EMPTY'
    );
  }

  const topics: ParsedTopic[] = [];
  let currentTopic: ParsedTopic | null = null;
  let questionNumber = 0;

  const questionPatterns = [
    /^(\d+)[.\)]\s*(.+)/,
    /^Q(\d+)[.\)]\s*(.+)/,
    /^Question\s+(\d+)[:\.\s]+(.+)/i,
    /^(\d+)\s*[-]\s*(.+)/,
  ];

  const topicPattern = /^[A-Z][A-Za-z\s\u2010-\u2025]{3,80}$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let isQuestion = false;
    let questionContent = '';
    let matchedNumber = 0;

    for (const pattern of questionPatterns) {
      const match = line.match(pattern);
      if (match) {
        isQuestion = true;
        matchedNumber = parseInt(match[1], 10);
        questionContent = match[2];
        break;
      }
    }

    if (isQuestion) {
      if (!currentTopic) {
        currentTopic = { name: 'General Questions', questions: [] };
        topics.push(currentTopic);
      }
      currentTopic.questions.push({
        content: questionContent,
        number: matchedNumber || ++questionNumber,
      });
    } else if (topicPattern.test(line) || looksLikeTopicHeadline(line, lines, i)) {
      const nextLinesHaveQuestions = lookAheadForQuestions(lines, i + 1);

      if (nextLinesHaveQuestions) {
        currentTopic = { name: line, questions: [] };
        topics.push(currentTopic);
        questionNumber = 0;
      }
    } else if (currentTopic && currentTopic.questions.length > 0) {
      const lastQuestion = currentTopic.questions[currentTopic.questions.length - 1];
      if (lastQuestion && !line.match(/^[\d\s]+$/)) {
        lastQuestion.content += ' ' + line;
      }
    }
  }

  if (topics.length === 0) {
    throw new PDFParseError(
      'No topics found in PDF. Ensure your PDF has topic headlines followed by numbered questions.',
      'PDF_NO_TOPICS'
    );
  }

  const totalQuestions = topics.reduce((sum, t) => sum + t.questions.length, 0);
  if (totalQuestions === 0) {
    throw new PDFParseError(
      'No questions found in PDF. Ensure questions are numbered (1., 2., 3., etc.) below each topic.',
      'PDF_NO_QUESTIONS'
    );
  }

  return { topics };
}

function looksLikeTopicHeadline(line: string, allLines: string[], index: number): boolean {
  if (line.length > 100) return false;

  const topicKeywords = [
    'Concurrency', 'API', 'Design', 'Pattern', 'Database', 'SQL', 'REST',
    'Java', 'Python', 'System', 'Distributed', 'Cache', 'Security',
    'Testing', 'Spring', 'Microservices', 'Architecture', 'Data Structures',
    'Algorithms', 'Frontend', 'Backend', 'DevOps', 'Cloud', 'Containers'
  ];

  const hasTopicKeyword = topicKeywords.some((keyword) =>
    line.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasTopicKeyword) return true;

  const isShortLine = line.length < 80;
  const hasCapitalization = line[0] === line[0].toUpperCase();
  const nextLine = allLines[index + 1];

  if (isShortLine && hasCapitalization && nextLine) {
    const questionPatterns = [
      /^(\d+)[.\)]/,
      /^Q\d+[.\)]/,
      /^Question\s+\d+/i,
    ];
    return questionPatterns.some((pattern) => pattern.test(nextLine));
  }

  return false;
}

function lookAheadForQuestions(lines: string[], startIndex: number, maxLines: number = 3): boolean {
  const questionPatterns = [
    /^(\d+)[.\)]/,
    /^Q\d+[.\)]/,
    /^Question\s+\d+/i,
  ];

  for (let i = startIndex; i < Math.min(startIndex + maxLines, lines.length); i++) {
    const line = lines[i];
    if (questionPatterns.some((pattern) => pattern.test(line))) {
      return true;
    }
    if (/^[A-Z][A-Za-z\s]{3,80}$/.test(line) && !line.match(/\d{2,}/)) {
      return false;
    }
  }

  return false;
}

/**
 * Main function to parse a PDF file into structured data
 * Uses the standalone CLI script to avoid Next.js bundling issues
 *
 * @param file - File object or Buffer
 * @returns Parsed topics and questions
 * @throws PDFParseError if parsing fails
 */
export async function parsePDF(file: File | Buffer): Promise<PDFParseResult> {
  // Save file to temp
  const tempPath = await saveToTempFile(file);

  try {
    // Path to the standalone parser script
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf-parser-standalone.ts');

    // Run the standalone script using tsx
    const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}" "${tempPath}"`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // The JSON output should be in stdout
    // Filter out any non-JSON lines (warnings, debug output)
    const jsonLine = stdout.trim().split('\n').find(line => line.trim().startsWith('{'));

    if (!jsonLine) {
      throw new PDFParseError(
        `Failed to parse PDF: No valid JSON output from parser script`,
        'PDF_PARSE_ERROR'
      );
    }

    const result = JSON.parse(jsonLine.trim()) as StandaloneResult | StandaloneError;

    if ('error' in result) {
      throw new PDFParseError(result.message, result.code);
    }

    return result.data;
  } catch (error) {
    if (error instanceof PDFParseError) {
      throw error;
    }

    if (error instanceof Error) {
      // Check if it's a JSON parsing error (script output wasn't valid JSON)
      if (error.message.includes('JSON')) {
        throw new PDFParseError(
          `Failed to parse PDF: Invalid output from parser script`,
          'PDF_PARSE_ERROR'
        );
      }
      throw new PDFParseError(
        `Failed to parse PDF: ${error.message}`,
        'PDF_EXTRACTION_FAILED'
      );
    }

    throw new PDFParseError(
      'Failed to parse PDF: Unknown error',
      'PDF_EXTRACTION_FAILED'
    );
  } finally {
    // Clean up temp file
    try {
      await fs.promises.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * PDFParserService interface for dependency injection
 */
export const PDFParserService = {
  extractPDFText,
  parsePDFStructure,
  parsePDF,
} as const;

export type PDFParserService = typeof PDFParserService;
