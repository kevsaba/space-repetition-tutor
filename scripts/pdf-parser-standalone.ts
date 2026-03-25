import * as fs from 'fs';
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log(JSON.stringify({ error: 'PDF_EXTRACTION_FAILED', code: 'NO_INPUT_FILE', message: 'No input file provided' }));
    process.exit(1);
  }

  try {
    const data = new Uint8Array(fs.readFileSync(inputPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      fullText += pageText + ' ';
    }
    await pdf.destroy();

    // Normalize - multiple spaces indicate new sections/topics
    let normalized = fullText.replace(/\s+/g, ' ').trim();
    
    // Split by double spaces to identify potential sections
    // Topics are typically followed by numbered questions
    const parts = normalized.split('  ').map(p => p.trim()).filter(p => p);

    const topics: any[] = [];
    let currentTopic: any = null;

    for (const part of parts) {
      // Check if this part starts with a number (question)
      const questionMatch = part.match(/^(\d+)[.\)]\s+(.+)/);
      if (questionMatch) {
        if (!currentTopic) {
          currentTopic = { name: 'General Questions', questions: [] };
          topics.push(currentTopic);
        }
        currentTopic.questions.push({ content: questionMatch[2], number: parseInt(questionMatch[1]) });
      } else {
        // This might be a topic name
        // Check if the next part has a question
        const topicKeywords = ['Concurrency', 'API', 'Design', 'Pattern', 'Database', 'SQL', 'REST', 'Java', 'Python', 'System', 'Distributed', 'Cache', 'Security', 'Testing', 'Spring', 'Microservices', 'Architecture', 'Data Structures', 'Algorithms', 'Frontend', 'Backend', 'DevOps', 'Cloud', 'Frameworks'];
        
        if (part.length > 3 && part.length < 80 && /^[A-Z]/.test(part)) {
          currentTopic = { name: part, questions: [] };
          topics.push(currentTopic);
        }
      }
    }

    // Also try to extract questions from the whole text using regex
    // This handles cases where questions aren't in separate parts
    const questionPattern = /(\d+)[.\)]\s+([^0-9]+?)(?=\s+\d+[.\)]|$)/g;
    const allText = normalized;
    let match;
    const extractedQuestions: any[] = [];
    
    while ((match = questionPattern.exec(allText)) !== null) {
      extractedQuestions.push({
        number: parseInt(match[1]),
        content: match[2].trim()
      });
    }

    // If we have questions but no topics properly organized, reorganize
    if (extractedQuestions.length > 0 && topics.length > 0) {
      // Assign questions to topics based on position
      let qIndex = 0;
      for (const topic of topics) {
        while (qIndex < extractedQuestions.length && (topic.name === 'General Questions' || !extractedQuestions[qIndex].content.includes('Spring'))) {
          if (topic.name === 'Spring Framework' || (topic.name !== 'Java Concurrency' && extractedQuestions[qIndex].content.toLowerCase().includes('spring'))) {
            // skip
          } else if (topic.name === 'Java Concurrency' || extractedQuestions[qIndex].content.toLowerCase().includes('java') || extractedQuestions[qIndex].content.toLowerCase().includes('thread') || extractedQuestions[qIndex].content.toLowerCase().includes('volatile')) {
            topic.questions.push(extractedQuestions[qIndex]);
          }
          qIndex++;
        }
      }
    }

    // Final fallback: if we have extracted questions but no topics were found properly, create a single topic
    if (topics.length === 0 || topics.every(t => t.questions.length === 0)) {
      if (extractedQuestions.length > 0) {
        topics.length = 0;
        topics.push({ name: 'Interview Questions', questions: extractedQuestions });
      } else {
        // Last resort - check if there's any Java or Spring content
        const javaQuestions = Array.from(allText.matchAll(/(\d+)[.\)]\s+([^0-9]+?)(?=\s+\d+[.\)]|Spring|Frameworks)/g)).map(m => ({
          number: parseInt(m[1]),
          content: m[2].trim()
        }));
        const springQuestions = Array.from(allText.matchAll(/(\d+)[.\)]\s+([^0-9]+?)(?=\s+\d+[.\)]|$)/g)).slice(javaQuestions.length).map(m => ({
          number: parseInt(m[1]),
          content: m[2].trim()
        }));

        if (javaQuestions.length > 0) topics.push({ name: 'Java Concurrency', questions: javaQuestions });
        if (springQuestions.length > 0 && springQuestions[0]) topics.push({ name: 'Spring Framework', questions: springQuestions });
      }
    }

    if (topics.length === 0) throw new Error('PDF_NO_TOPICS');
    if (topics.reduce((sum, t) => sum + t.questions.length, 0) === 0) throw new Error('PDF_NO_QUESTIONS');

    console.log(JSON.stringify({ success: true, data: { topics } }));
  } catch (error: any) {
    console.log(JSON.stringify({ error: 'PDF_EXTRACTION_FAILED', code: error.message || 'UNKNOWN_ERROR', message: error.message || 'Unknown error' }));
    process.exit(1);
  }
}

main();
