/**
 * Test script to debug career upload issue
 *
 * Run with: npx tsx test-career-upload.ts
 */

import { CareerService, CareerError } from './lib/services/career.service';
import { PDFParserService } from './lib/services/pdf-parser.service';
import * as fs from 'fs';

async function testCareerCreation() {
  // Create a simple test PDF content (minimal)
  // In reality, you'd upload an actual PDF
  const testPDFPath = process.argv[2];

  if (!testPDFPath) {
    console.error('Please provide a PDF file path as argument');
    console.error('Usage: npx tsx test-career-upload.ts <path-to-pdf>');
    process.exit(1);
  }

  if (!fs.existsSync(testPDFPath)) {
    console.error('File not found:', testPDFPath);
    process.exit(1);
  }

  try {
    console.log('Reading PDF file:', testPDFPath);

    // Read the file as a buffer
    const buffer = fs.readFileSync(testPDFPath);

    // Create a mock File object (similar to what the API receives)
    const file = new File([buffer], 'test.pdf', { type: 'application/pdf' });

    console.log('Parsing PDF...');
    const parsedData = await PDFParserService.parsePDF(file);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

    // For now, we can't test the full career creation without a real user ID
    // But we can verify the PDF parsing works
    console.log('\nPDF parsing successful!');
    console.log('Topics found:', parsedData.topics.length);
    parsedData.topics.forEach((topic, i) => {
      console.log(`  Topic ${i + 1}: ${topic.name} (${topic.questions.length} questions)`);
    });

  } catch (error) {
    console.error('Error:', error);
    if (error instanceof CareerError) {
      console.error('Career Error Code:', error.code);
      console.error('Career Error Message:', error.message);
    }
    process.exit(1);
  }
}

testCareerCreation();
