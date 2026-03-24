/**
 * LLM Response Validation
 *
 * Utilities for validating LLM responses.
 */

import { z } from 'zod';
import {
  LLMFeedbackResponse,
  LLMQuestionResponse,
  LLMFollowUpResponse,
  type QuestionDifficulty,
  type QuestionType,
} from './types';
import { LLMValidationError } from './errors';

// Zod schemas for validation

const questionDifficultySchema = z.enum(['JUNIOR', 'MID', 'SENIOR']);
const questionTypeSchema = z.enum(['CONCEPTUAL', 'CODING', 'DESIGN']);

const llmFeedbackSchema = z.object({
  evaluation: z.string().min(1),
  higherLevelArticulation: z.string().min(1),
  correction: z.string().min(1),
  failureTimeline: z.string().min(1),
  interviewReadyAnswer: z.string().min(1),
  analogy: z.string().min(1),
  productionInsight: z.string().min(1),
});

const llmFeedbackResponseSchema = z.object({
  passed: z.boolean(),
  feedback: llmFeedbackSchema,
});

const generatedQuestionSchema = z.object({
  content: z.string().min(1),
  difficulty: questionDifficultySchema,
  type: questionTypeSchema,
  expectedTopics: z.array(z.string().min(1)).min(1),
  hint: z.string().optional(),
});

const llmQuestionResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

const followUpQuestionSchema = z.object({
  content: z.string().min(1),
  reason: z.string().min(1),
});

const llmFollowUpResponseSchema = z.object({
  followUpQuestions: z.array(followUpQuestionSchema).max(2),
});

/**
 * Validate LLM feedback response
 */
export function validateFeedbackResponse(
  data: unknown,
): LLMFeedbackResponse {
  try {
    const validated = llmFeedbackResponseSchema.parse(data);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new LLMValidationError('Invalid feedback response format', errors);
    }
    throw new LLMValidationError('Invalid feedback response format', ['Unknown validation error']);
  }
}

/**
 * Validate LLM question response
 */
export function validateQuestionResponse(
  data: unknown,
): LLMQuestionResponse {
  try {
    const validated = llmQuestionResponseSchema.parse(data);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new LLMValidationError('Invalid question response format', errors);
    }
    throw new LLMValidationError('Invalid question response format', ['Unknown validation error']);
  }
}

/**
 * Validate LLM follow-up response
 */
export function validateFollowUpResponse(
  data: unknown,
): LLMFollowUpResponse {
  try {
    const validated = llmFollowUpResponseSchema.parse(data);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new LLMValidationError('Invalid follow-up response format', errors);
    }
    throw new LLMValidationError('Invalid follow-up response format', ['Unknown validation error']);
  }
}

/**
 * Extract JSON from LLM response
 * Handles responses that may include markdown code blocks
 */
export function extractJSON(content: string): unknown {
  let cleaned = content.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1];
  }

  // Try to find first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Try to find first [ and last ] for array responses
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    // Use array if it's the outer structure
    if (firstBracket < firstBrace || firstBrace === -1) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
