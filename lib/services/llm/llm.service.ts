/**
 * LLM Service
 *
 * Main service for interacting with the LLM API.
 * Provides methods for evaluating answers, generating questions, and generating follow-ups.
 */

import { llmConfig } from './config';
import {
  getEvaluateAnswerPrompt,
  getEvaluateFollowUpPrompt,
  getGenerateQuestionsPrompt,
  getGenerateFollowUpPrompt,
  SYSTEM_PROMPT,
  CLARIFYING_INSTRUCTION,
} from './prompts';
import {
  validateFeedbackResponse,
  validateQuestionResponse,
  validateFollowUpResponse,
  extractJSON,
} from './validation';
import { withRetry } from './retry';
import {
  LLMApiError,
  LLMParseError,
} from './errors';
import type {
  LLMApiRequest,
  LLMApiResponse,
  EvaluateAnswerInput,
  LLMFeedbackResponse,
  GenerateQuestionsInput,
  LLMQuestionResponse,
  GenerateFollowUpInput,
  LLMFollowUpResponse,
  EvaluateFollowUpInput,
} from './types';

/**
 * LLMService class
 *
 * Handles all LLM API interactions with retry logic and validation.
 */
export class LLMService {
  constructor(private config = llmConfig) {}

  /**
   * Make a request to the LLM API
   */
  private async callLLM(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
    const request: LLMApiRequest = {
      model: this.config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-litellm-api-key': this.config.apiKey,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new LLMApiError(
        `LLM API error: ${response.statusText}`,
        response.status,
        responseBody,
      );
    }

    const data: LLMApiResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new LLMApiError('No choices returned from LLM', 500, data);
    }

    return data.choices[0].message.content;
  }

  /**
   * Evaluate a user's answer to a question
   *
   * @param input - Evaluation input parameters
   * @returns Structured feedback with pass/fail determination
   */
  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LLMFeedbackResponse> {
    const prompt = getEvaluateAnswerPrompt(
      input.question,
      input.userAnswer,
      input.currentBox,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ]);

        const parsed = extractJSON(content);
        return validateFeedbackResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: error instanceof Error ? error.message : 'Invalid JSON' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ]);

          const parsed = extractJSON(clarifiedContent);
          return validateFeedbackResponse(parsed);
        }
        throw error;
      }
    }, this.config.retry, 'evaluateAnswer');
  }

  /**
   * Generate new questions for a topic
   *
   * @param input - Question generation parameters
   * @returns Generated questions
   */
  async generateQuestions(input: GenerateQuestionsInput): Promise<LLMQuestionResponse> {
    const prompt = getGenerateQuestionsPrompt(
      input.topic,
      input.difficulty,
      input.type,
      input.count || 3,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ]);

        const parsed = extractJSON(content);
        return validateQuestionResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: 'Invalid JSON format' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ]);

          const parsed = extractJSON(clarifiedContent);
          return validateQuestionResponse(parsed);
        }
        throw error;
      }
    }, this.config.retry, 'generateQuestions');
  }

  /**
   * Generate follow-up questions based on user's answer
   *
   * @param input - Follow-up generation parameters
   * @returns Follow-up questions
   */
  async generateFollowUp(input: GenerateFollowUpInput): Promise<LLMFollowUpResponse> {
    const prompt = getGenerateFollowUpPrompt(
      input.originalQuestion,
      input.userAnswer,
      input.passed,
      input.mode,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ]);

        const parsed = extractJSON(content);
        return validateFollowUpResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: 'Invalid JSON format' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ]);

          const parsed = extractJSON(clarifiedContent);
          return validateFollowUpResponse(parsed);
        }
        throw error;
      }
    }, this.config.retry, 'generateFollowUp');
  }

  /**
   * Evaluate a user's follow-up answer
   *
   * @param input - Follow-up evaluation input parameters
   * @returns Structured feedback with pass/fail determination
   */
  async evaluateFollowUp(input: EvaluateFollowUpInput): Promise<LLMFeedbackResponse> {
    const prompt = getEvaluateFollowUpPrompt(
      input.originalQuestion,
      input.followUpQuestion,
      input.userAnswer,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ]);

        const parsed = extractJSON(content);
        return validateFeedbackResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: error instanceof Error ? error.message : 'Invalid JSON' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ]);

          const parsed = extractJSON(clarifiedContent);
          return validateFeedbackResponse(parsed);
        }
        throw error;
      }
    }, this.config.retry, 'evaluateFollowUp');
  }
}

/**
 * Default LLMService instance
 */
export const llmService = new LLMService();

/**
 * LLMService interface for dependency injection
 */
export const LLMServiceInterface = {
  evaluateAnswer: (input: EvaluateAnswerInput) => llmService.evaluateAnswer(input),
  evaluateFollowUp: (input: EvaluateFollowUpInput) => llmService.evaluateFollowUp(input),
  generateQuestions: (input: GenerateQuestionsInput) => llmService.generateQuestions(input),
  generateFollowUp: (input: GenerateFollowUpInput) => llmService.generateFollowUp(input),
} as const;

export type LLMServiceInterface = typeof LLMServiceInterface;
