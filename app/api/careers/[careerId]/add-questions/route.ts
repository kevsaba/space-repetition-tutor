/**
 * POST /api/careers/:careerId/add-questions
 *
 * Upload a CSV/Excel file to add questions to an existing career path.
 *
 * Accepts:
 * - CSV file (multipart/form-data)
 * - Excel file (.xlsx) (multipart/form-data)
 *
 * Returns: { questionsAdded, topicsCreated, topicsAdded }
 *
 * Process:
 * 1. Verify user owns the career
 * 2. Parse CSV/Excel to extract topics and questions
 * 3. Smart match topics to existing database topics
 * 4. Add questions to topics
 * 5. Link new topics to career if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { CSVParseError, CSVParserService } from '@/lib/services/csv-parser.service';
import { ExcelParseError, ExcelParserService } from '@/lib/services/excel-parser.service';

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];

/**
 * POST handler for adding questions via CSV/Excel upload
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticate(request);
    const { careerId } = await params;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasAllowedExtension) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only CSV and Excel (.xlsx) files are allowed',
          },
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          },
        },
        { status: 400 }
      );
    }

    // Parse file based on extension
    let parsedData;
    try {
      console.log('Starting file parse for file:', file.name, 'size:', file.size);

      if (fileName.endsWith('.csv')) {
        parsedData = await CSVParserService.parseCSV(file);
        console.log('CSV parsed successfully, topics found:', parsedData.topics.length);
      } else if (fileName.endsWith('.xlsx')) {
        parsedData = await ExcelParserService.parseExcel(file);
        console.log('Excel parsed successfully, topics found:', parsedData.topics.length);
      } else {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Only CSV and Excel (.xlsx) files are allowed',
            },
          },
          { status: 400 }
        );
      }
    } catch (error) {
      if (error instanceof CSVParseError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      if (error instanceof ExcelParseError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      throw error;
    }

    // Add questions to existing career
    const result = await CareerService.addQuestionsToCareer(
      authResult.userId,
      careerId,
      parsedData
    );

    return NextResponse.json({
      questionsAdded: result.questionsAdded,
      topicsCreated: result.topicsCreated,
      topicsAdded: result.topicsAdded,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && (error.message === 'Not authenticated' || error.message === 'Invalid token')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Handle domain errors
    if (error instanceof CareerError) {
      const statusCode = error.code === 'USER_NOT_FOUND' ? 401 : 400;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: statusCode }
      );
    }

    // Log unexpected errors
    console.error('Add questions error:', error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred while processing the upload' } },
      { status: 500 }
    );
  }
}
