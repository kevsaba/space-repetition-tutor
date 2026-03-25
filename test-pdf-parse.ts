/**
 * Test script to verify PDF parsing works
 */

import { PDFParserService, PDFParseError } from './lib/services/pdf-parser.service';

// Create a simple PDF buffer for testing
// In a real scenario, this would be an actual PDF file
const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000274 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n361\n%%EOF');

async function testPdfParsing() {
  console.log('Testing PDF parsing...');

  try {
    const result = await PDFParserService.parsePDF(testPdfBuffer);
    console.log('✅ PDF parsing successful!');
    console.log('Extracted text:', result);
    return true;
  } catch (error) {
    if (error instanceof PDFParseError) {
      console.error('❌ PDF parsing failed:', error.code, error.message);
    } else if (error instanceof Error) {
      console.error('❌ PDF parsing failed:', error.message);
    } else {
      console.error('❌ PDF parsing failed:', error);
    }
    return false;
  }
}

testPdfParsing().then(success => {
  process.exit(success ? 0 : 1);
});
