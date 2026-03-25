/**
 * Debug test to see what pdfjs-dist returns
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const minimalPdf = Buffer.from(
'%PDF-1.4\n' +
'1 0 obj\n' +
'<< /Type /Catalog /Pages 2 0 R >>\n' +
'endobj\n' +
'2 0 obj\n' +
'<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\n' +
'endobj\n' +
'3 0 obj\n' +
'<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 612 792 ] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n' +
'endobj\n' +
'4 0 obj\n' +
'<< /Length 120 >>\n' +
'stream\n' +
'BT\n' +
'/F1 12 Tf\n' +
'50 750 Td\n' +
'(Java Concurrency) Tj\n' +
'50 720 Td\n' +
'(1. What is a thread in Java?) Tj\n' +
'50 700 Td\n' +
'(2. Explain the synchronized keyword) Tj\n' +
'50 680 Td\n' +
'(Spring Framework) Tj\n' +
'50 660 Td\n' +
'(1. What is dependency injection?) Tj\n' +
'ET\n' +
'endstream\n' +
'endobj\n' +
'5 0 obj\n' +
'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n' +
'endobj\n' +
'xref\n' +
'0 6\n' +
'0000000000 65535 f\n' +
'0000000009 00000 n\n' +
'0000000052 00000 n\n' +
'0000000109 00000 n' +
'0000000262 00000 n\n' +
'0000000410 00000 n\n' +
'trailer\n' +
'<< /Size 6 /Root 1 0 R >>\n' +
'startxref\n' +
'482\n' +
'%%EOF\n'
);

async function test() {
  const data = new Uint8Array(minimalPdf);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  console.log('PDF has', pdf.numPages, 'page(s)');

  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();

  console.log('\n=== Text Content Items ===');
  console.log('Total items:', textContent.items.length);

  for (let i = 0; i < textContent.items.length; i++) {
    const item: any = textContent.items[i];
    console.log(`Item ${i}:`);
    console.log(`  str: "${item.str}"`);
    console.log(`  hasEOL: ${item.hasEOL}`);
    console.log(`  transform: [${item.transform?.join(', ')}]`);
    console.log(`  width: ${item.width}`);
  }

  await pdf.destroy();
}

test().catch(console.error);
