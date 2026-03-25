/**
 * Direct test of PDF parsing functionality
 * This tests the core PDF parsing without going through the API
 */

import { PDFParserService, PDFParseError } from './lib/services/pdf-parser.service';

// Test with the actual pdfjs-dist import
async function testPdfParsingDirectly() {
  console.log('=== Testing PDF Parsing Directly ===\n');

  // Test 1: Test with a simple buffer (will fail parsing but should handle error gracefully)
  console.log('Test 1: Testing with empty buffer...');
  try {
    const result = await PDFParserService.extractPDFText(Buffer.from('test'));
    console.log('✅ extractPDFText works, got:', result.substring(0, 100));
  } catch (error) {
    if (error instanceof PDFParseError) {
      console.log('✅ Got expected PDFParseError:', error.code);
    } else {
      console.log('❌ Unexpected error:', error instanceof Error ? error.message : error);
    }
  }

  // Test 2: Test parsePDFStructure with sample text
  console.log('\nTest 2: Testing parsePDFStructure...');
  try {
    const sampleText = `
Java Concurrency

1. What is a thread in Java?
2. Explain the difference between process and thread.
3. What is the purpose of the synchronized keyword?

Spring Framework

1. What is dependency injection?
2. Explain the Spring Bean lifecycle.
3. What is @Autowired used for?
`;
    const result = await PDFParserService.parsePDFStructure(sampleText);
    console.log('✅ parsePDFStructure works!');
    console.log('  Topics found:', result.topics.length);
    result.topics.forEach(t => {
      console.log(`  - ${t.name}: ${t.questions.length} questions`);
    });
  } catch (error) {
    console.log('❌ parsePDFStructure failed:', error instanceof Error ? error.message : error);
  }

  console.log('\n=== Tests Complete ===');
}

testPdfParsingDirectly().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
