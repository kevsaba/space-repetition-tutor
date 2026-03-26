/**
 * CSVParserService - Parse CSV Files into Structured Question Data
 *
 * Extracts topics and questions from CSV files.
 *
 * Expected format:
 * Topic Name,Question Text
 * Java Concurrency,Explain the difference between synchronized blocks and ReentrantLock
 * REST API Design,What are the key principles of RESTful API design?
 *
 * Returns structured data: { topics: [{ name, questions: [{ content, number }] }] }
 */

/**
 * Domain error for CSV parsing operations
 */
export class CSVParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CSVParseError';
  }
}

/**
 * Parsed question from CSV
 */
export interface ParsedQuestion {
  content: string;
  number: number;
}

/**
 * Parsed topic from CSV
 */
export interface ParsedTopic {
  name: string;
  questions: ParsedQuestion[];
}

/**
 * Result of CSV parsing
 */
export interface CSVParseResult {
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
 * Parse a CSV string into structured topics and questions.
 *
 * Handles:
 * - Comma-separated values
 * - Quoted fields (questions may contain commas)
 * - Multiple questions per topic
 * - Whitespace trimming
 *
 * @param csvText - Raw CSV text content
 * @returns Parsed topics with questions
 * @throws CSVParseError if parsing fails
 */
export function parseCSVStructure(csvText: string): CSVParseResult {
  // Normalize line endings
  const normalized = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    throw new CSVParseError(
      'CSV file is empty',
      'EMPTY_FILE'
    );
  }

  // Parse CSV lines (handle quoted fields)
  const lines = parseCSVLines(normalized);

  if (lines.length < 2) {
    throw new CSVParseError(
      'CSV file must have a header row and at least one data row',
      'NO_DATA_ROWS'
    );
  }

  // Extract and validate header
  const header = lines[0].map(h => h.trim().toLowerCase());
  const hasTopicName = header.some(h => h === 'topic name' || h === 'topic');
  const hasQuestionText = header.some(h => h === 'question text' || h === 'question' || h === 'questions');

  if (!hasTopicName || !hasQuestionText) {
    throw new CSVParseError(
      `CSV must have columns: ${EXPECTED_HEADERS.join(', ')}`,
      'INVALID_COLUMNS'
    );
  }

  // Find column indices
  const topicNameIndex = header.findIndex(h => h === 'topic name' || h === 'topic');
  const questionTextIndex = header.findIndex(h => h === 'question text' || h === 'question' || h === 'questions');

  // Group questions by topic
  const topicMap = new Map<string, ParsedQuestion[]>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];

    if (row.length < 2) {
      continue; // Skip empty or malformed rows
    }

    const topicName = row[topicNameIndex]?.trim();
    const questionText = row[questionTextIndex]?.trim();

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
    throw new CSVParseError(
      'No valid questions found in CSV file. Check the format.',
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
 * Parse CSV lines handling quoted fields.
 *
 * This function implements a simple CSV parser that:
 * - Handles commas within quoted fields
 * - Handles double-quotes escaping ("")
 * - Trims whitespace from fields
 *
 * @param csvText - CSV text content
 * @returns Array of rows, each row is an array of field values
 */
function parseCSVLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rows = csvText.split('\n');

  for (const row of rows) {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add the last field
    fields.push(currentField.trim());

    // Skip completely empty lines (but keep lines with just whitespace that had commas)
    if (fields.some(f => f.length > 0)) {
      lines.push(fields);
    }
  }

  return lines;
}

/**
 * Main function to parse a CSV file into structured data.
 *
 * @param file - File object or Buffer
 * @returns Parsed topics and questions
 * @throws CSVParseError if parsing fails
 */
export async function parseCSV(file: File | Buffer): Promise<CSVParseResult> {
  // Get file content as text
  let csvText: string;

  if (Buffer.isBuffer(file)) {
    csvText = file.toString('utf-8');
  } else {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new CSVParseError(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        'FILE_TOO_LARGE'
      );
    }

    csvText = await file.text();
  }

  return parseCSVStructure(csvText);
}

/**
 * CSVParserService interface for dependency injection
 */
export const CSVParserService = {
  parseCSVStructure,
  parseCSV,
} as const;

export type CSVParserService = typeof CSVParserService;
