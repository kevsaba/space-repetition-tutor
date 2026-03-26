/**
 * ExcelParserService - Parse Excel (.xlsx) Files into Structured Question Data
 *
 * Extracts topics and questions from Excel files.
 *
 * Expected format:
 * | Topic Name       | Question Text                                          |
 * |------------------|--------------------------------------------------------|
 * | Java Concurrency | Explain the difference between synchronized blocks...   |
 * | REST API Design  | What are the key principles of RESTful API design?     |
 *
 * Returns structured data: { topics: [{ name, questions: [{ content, number }] }] }
 */

import * as XLSX from 'xlsx';

/**
 * Domain error for Excel parsing operations
 */
export class ExcelParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExcelParseError';
  }
}

/**
 * Parsed question from Excel
 */
export interface ParsedQuestion {
  content: string;
  number: number;
}

/**
 * Parsed topic from Excel
 */
export interface ParsedTopic {
  name: string;
  questions: ParsedQuestion[];
}

/**
 * Result of Excel parsing
 */
export interface ExcelParseResult {
  topics: ParsedTopic[];
}

/**
 * Expected column headers
 */
const EXPECTED_HEADERS = ['Topic Name', 'Question Text'];

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Parse an Excel file buffer into structured topics and questions.
 *
 * Handles:
 * - .xlsx files
 * - First sheet only
 * - First row as header
 * - Multiple questions per topic
 * - Merged cells
 * - Empty rows
 *
 * @param buffer - Excel file buffer
 * @returns Parsed topics with questions
 * @throws ExcelParseError if parsing fails
 */
export function parseExcelBuffer(buffer: Buffer): ExcelParseResult {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (error) {
    throw new ExcelParseError(
      'Failed to read Excel file. Please ensure it is a valid .xlsx file.',
      'INVALID_EXCEL'
    );
  }

  if (workbook.SheetNames.length === 0) {
    throw new ExcelParseError(
      'Excel file contains no sheets',
      'NO_SHEETS'
    );
  }

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON (array of arrays for header processing)
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (jsonData.length < 2) {
    throw new ExcelParseError(
      'Excel file must have a header row and at least one data row',
      'NO_DATA_ROWS'
    );
  }

  // Extract and validate header
  const header = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
  const hasTopicName = header.some((h: string) => h === 'topic name' || h === 'topic');
  const hasQuestionText = header.some((h: string) => h === 'question text' || h === 'question' || h === 'questions');

  if (!hasTopicName || !hasQuestionText) {
    throw new ExcelParseError(
      `Excel must have columns: ${EXPECTED_HEADERS.join(', ')}`,
      'INVALID_COLUMNS'
    );
  }

  // Find column indices
  const topicNameIndex = header.findIndex((h: string) => h === 'topic name' || h === 'topic');
  const questionTextIndex = header.findIndex((h: string) => h === 'question text' || h === 'question' || h === 'questions');

  // Group questions by topic
  const topicMap = new Map<string, ParsedQuestion[]>();

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];

    if (!row || row.length < Math.max(topicNameIndex, questionTextIndex) + 1) {
      continue; // Skip empty or malformed rows
    }

    const topicName = String(row[topicNameIndex] || '').trim();
    const questionText = String(row[questionTextIndex] || '').trim();

    // Skip rows without both topic and question
    if (!topicName || !questionText) {
      continue;
    }

    // Skip header-like rows
    if (topicName.toLowerCase().includes('topic') && questionText.toLowerCase().includes('question')) {
      continue;
    }

    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, []);
    }

    const questions = topicMap.get(topicName)!;
    questions.push({
      content: questionText,
      number: questions.length + 1,
    });
  }

  if (topicMap.size === 0) {
    throw new ExcelParseError(
      'No valid questions found in Excel file. Check the format.',
      'NO_QUESTIONS'
    );
  }

  // Convert map to array of topics
  const topics: ParsedTopic[] = Array.from(topicMap.entries()).map(([name, questions]) => ({
    name,
    questions,
  }));

  return { topics };
}

/**
 * Main function to parse an Excel file into structured data.
 *
 * @param file - File object or Buffer
 * @returns Parsed topics and questions
 * @throws ExcelParseError if parsing fails
 */
export async function parseExcel(file: File | Buffer): Promise<ExcelParseResult> {
  // Get file content as buffer
  let buffer: Buffer;

  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ExcelParseError(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        'FILE_TOO_LARGE'
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  return parseExcelBuffer(buffer);
}

/**
 * ExcelParserService interface for dependency injection
 */
export const ExcelParserService = {
  parseExcelBuffer,
  parseExcel,
} as const;

export type ExcelParserService = typeof ExcelParserService;
