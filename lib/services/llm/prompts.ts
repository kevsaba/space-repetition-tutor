/**
 * LLM Prompt Templates
 *
 * Prompt templates and variable substitution for LLM requests.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Evaluate answer prompt template
 */
const EVALUATE_ANSWER_TEMPLATE = `You are an expert interviewer evaluating a candidate's answer.

Question: {question}
Candidate's Answer: {userAnswer}
Current Box: {currentBox} (1 = struggling, 2 = improving, 3 = mastered)
Strictness: {strictness}

{strictnessGuidance}

Respond in JSON format:
{
  "passed": true/false,
  "feedback": {
    "evaluation": "What they got right, specific points they captured",
    "higherLevelArticulation": "How to phrase this at senior level",
    "correction": "Any misconceptions to correct, with explanation",
    "failureTimeline": "What goes wrong without this knowledge (step by step)",
    "interviewReadyAnswer": "2-3 sentence polished answer",
    "analogy": "Memorable analogy or mnemonic",
    "productionInsight": "How this matters in real systems"
  }
}`;

/**
 * Strictness guidance for evaluation
 */
const STRICTNESS_GUIDANCE = {
  DEFAULT: `Evaluate based on a balanced standard:
- The core concept MUST be correctly understood
- Critical points MUST be covered (omitting important details should FAIL)
- Minor wording issues are acceptable
- Good explanations that miss some secondary details should PASS
- Box 1 requires basic understanding. Box 3 requires nuanced, senior-level articulation.`,

  STRICT: `Evaluate with high precision and rigor:
- The core concept MUST be correctly understood
- ALL important details MUST be covered
- Communication should be clear, precise, and professional
- Missing any critical point should FAIL
- Incomplete or vague explanations should FAIL
- Expects interview-ready articulation at all box levels.`,

  LENIENT: `Evaluate with focus on core understanding:
- The main concept MUST be correctly understood (this is non-negotiable)
- Minor omissions of details are acceptable
- Wording and communication style are secondary to conceptual understanding
- If the answer demonstrates they know the topic and key concepts, it should PASS
- Good for building confidence while still ensuring learning.`,
};

/**
 * Generate questions prompt template
 */
const GENERATE_QUESTIONS_TEMPLATE = `You are generating interview questions for: {topic}

Difficulty: {difficulty} (JUNIOR/MID/SENIOR)
Type: {type} (CONCEPTUAL/CODING/DESIGN)

Generate {count} questions that:
- Test deep understanding, not syntax trivia
- Require explaining trade-offs
- Connect to real production scenarios
- Have multiple valid approaches (for design questions)

Respond in JSON format:
{
  "questions": [
    {
      "content": "The question text",
      "difficulty": "MID",
      "type": "CONCEPTUAL",
      "expectedTopics": ["topic1", "topic2"],
      "hint": "Optional hint for if they struggle"
    }
  ]
}`;

/**
 * Generate follow-up prompt template
 */
const GENERATE_FOLLOWUP_TEMPLATE = `Original Question: {originalQuestion}
Candidate's Answer: {userAnswer}
Evaluation: {passed} (true/false)
Mode: {mode} (FREE or INTERVIEW)

Generate up to 2 follow-up questions that:
1. Dig deeper into gaps identified
2. Test related concepts they should know
3. Are directly relevant to the original topic

Do NOT change to a completely different topic.

Respond in JSON:
{
  "followUpQuestions": [
    {
      "content": "Follow-up question text",
      "reason": "Why this follow-up is relevant"
    }
  ]
}

If the answer was perfect and no follow-ups are needed, return empty array.`;

/**
 * Evaluate follow-up answer prompt template
 */
const EVALUATE_FOLLOWUP_TEMPLATE = `You are an expert interviewer evaluating a candidate's follow-up answer.

Original Question: {originalQuestion}
Follow-up Question: {followUpQuestion}
Candidate's Follow-up Answer: {userAnswer}
Strictness: {strictness}

{strictnessGuidance}

Respond in JSON format:
{
  "passed": true/false,
  "feedback": {
    "evaluation": "What they got right, specific points they captured",
    "higherLevelArticulation": "How to phrase this at senior level",
    "correction": "Any misconceptions to correct, with explanation",
    "failureTimeline": "What goes wrong without this knowledge (step by step)",
    "interviewReadyAnswer": "2-3 sentence polished answer",
    "analogy": "Memorable analogy or mnemonic",
    "productionInsight": "How this matters in real systems"
  }
}

Follow-ups test deeper understanding, so expect more nuanced answers than the original question.`;

/**
 * Substitute variables in a template
 */
function substituteTemplate(template: string, variables: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}

/**
 * Get strictness guidance text
 */
export function getStrictnessGuidance(strictness: 'DEFAULT' | 'STRICT' | 'LENIENT'): string {
  return STRICTNESS_GUIDANCE[strictness] || STRICTNESS_GUIDANCE.DEFAULT;
}

/**
 * Get evaluate answer prompt
 */
export function getEvaluateAnswerPrompt(
  question: string,
  userAnswer: string,
  currentBox: number,
  strictness: 'DEFAULT' | 'STRICT' | 'LENIENT' = 'DEFAULT',
): string {
  const strictnessGuidance = getStrictnessGuidance(strictness);
  return substituteTemplate(EVALUATE_ANSWER_TEMPLATE, {
    question,
    userAnswer,
    currentBox,
    strictness,
    strictnessGuidance,
  });
}

/**
 * Get generate questions prompt
 */
export function getGenerateQuestionsPrompt(
  topic: string,
  difficulty: string,
  type: string,
  count: number = 3,
): string {
  return substituteTemplate(GENERATE_QUESTIONS_TEMPLATE, {
    topic,
    difficulty,
    type,
    count,
  });
}

/**
 * Get generate follow-up prompt
 */
export function getGenerateFollowUpPrompt(
  originalQuestion: string,
  userAnswer: string,
  passed: boolean,
  mode: string,
): string {
  return substituteTemplate(GENERATE_FOLLOWUP_TEMPLATE, {
    originalQuestion,
    userAnswer,
    passed: passed ? 'true' : 'false',
    mode,
  });
}

/**
 * Get evaluate follow-up answer prompt
 */
export function getEvaluateFollowUpPrompt(
  originalQuestion: string,
  followUpQuestion: string,
  userAnswer: string,
  strictness: 'DEFAULT' | 'STRICT' | 'LENIENT' = 'DEFAULT',
): string {
  const strictnessGuidance = getStrictnessGuidance(strictness);
  return substituteTemplate(EVALUATE_FOLLOWUP_TEMPLATE, {
    originalQuestion,
    followUpQuestion,
    userAnswer,
    strictness,
    strictnessGuidance,
  });
}

/**
 * System prompt for all LLM interactions
 */
export const SYSTEM_PROMPT = `You are an expert technical interviewer. Always respond with valid JSON. Never include markdown formatting in your response - only pure JSON.`;

/**
 * Clarifying instruction to append when response format is incorrect
 */
export const CLARIFYING_INSTRUCTION = `

IMPORTANT: Your response must be valid JSON only. No markdown formatting, no code blocks, no explanations outside the JSON structure. Respond with ONLY the JSON object.`;
