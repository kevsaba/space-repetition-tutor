/**
 * POST /api/careers/upload
 *
 * Upload a PDF file to create a custom career path.
 *
 * Accepts:
 * - PDF file (multipart/form-data)
 * - careerName: User-provided name for their career path
 *
 * Returns: { careerId, topicsCreated, questionsAdded, topicMatches }
 *
 * Process:
 * 1. Parse PDF to extract topics and questions
 * 2. Smart match topics to existing database topics
 * 3. Create career with matched/new topics
 * 4. Add questions and make career active for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware';
import { CareerService, CareerError } from '@/lib/services/career.service';
import { PDFParseError, PDFParserService } from '@/lib/services/pdf-parser.service';

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types for PDF upload
 */
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/x-pdf',
];

/**
 * POST handler for PDF upload
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticate(request);

    // Parse multipart form data
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const careerName = formData.get('careerName') as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate career name
    if (!careerName || careerName.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_NAME', message: 'Career name is required' } },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only PDF files are allowed',
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

    // Parse PDF
    let parsedData;
    try {
      console.log('Starting PDF parse for file:', file.name, 'size:', file.size);
      parsedData = await PDFParserService.parsePDF(file);
      console.log('PDF parsed successfully, topics found:', parsedData.topics.length);
    } catch (error) {
      if (error instanceof PDFParseError) {
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

    // Create career from parsed data
    const result = await CareerService.createFromUpload(
      authResult.userId,
      careerName,
      parsedData
    );

    return NextResponse.json({
      careerId: result.careerId,
      careerName: careerName,
      topicsCreated: result.topicsCreated,
      questionsAdded: result.questionsAdded,
      topics: result.topicMatches.map((match) => ({
        name: match.matchedTo || match.name,
        questionsAdded: 0, // Will be updated when we track per-topic question counts
      })),
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
    console.error('PDF upload error:', error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred while processing the upload' } },
      { status: 500 }
    );
  }
}
