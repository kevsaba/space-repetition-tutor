/**
 * LLM Service
 *
 * Main service for interacting with the LLM API.
 * Provides methods for evaluating answers, generating questions, and generating follow-ups.
 * Uses runtime config (from setup wizard) or environment variables.
 */

import {
  getFreshLLMConfig,
  getLLMConfigWithUserFallback,
} from './config';
import { LLMConfig } from './config';
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
  /**
   * Get fresh config for each operation (supports runtime config changes)
   */
  private getConfig() {
    return getFreshLLMConfig();
  }

  /**
   * Test the LLM connection with a simple request
   * Used to validate credentials before saving
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.getConfig();
      const request: LLMApiRequest = {
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Respond with just "OK" to confirm connection.' },
        ],
        temperature: 0.1,
        max_tokens: 10,
      };

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-litellm-api-key': config.apiKey,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15000), // 15 second timeout for test
      });

      if (!response.ok) {
        const responseBody = await response.text();
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`,
        };
      }

      const data: LLMApiResponse = await response.json();
      if (!data.choices || data.choices.length === 0) {
        return { success: false, error: 'No response from API' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Make a request to the LLM API
   */
  private async callLLM(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, config?: LLMConfig): Promise<string> {
    const llmConfig = config || this.getConfig();
    const request: LLMApiRequest = {
      model: llmConfig.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    const response = await fetch(llmConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-litellm-api-key': llmConfig.apiKey,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(llmConfig.timeout),
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
    const userConfig = await getLLMConfigWithUserFallback();
    const strictness = userConfig.strictnessLevel || 'DEFAULT';

    const prompt = getEvaluateAnswerPrompt(
      input.question,
      input.userAnswer,
      input.currentBox,
      strictness,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ], userConfig);

        const parsed = extractJSON(content);
        return validateFeedbackResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: error instanceof Error ? error.message : 'Invalid JSON' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ], userConfig);

          const parsed = extractJSON(clarifiedContent);
          return validateFeedbackResponse(parsed);
        }
        throw error;
      }
    }, userConfig.retry, 'evaluateAnswer');
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
      input.customPrompt,
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
    }, this.getConfig().retry, 'generateQuestions');
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
    }, this.getConfig().retry, 'generateFollowUp');
  }

  /**
   * Evaluate a user's follow-up answer
   *
   * @param input - Follow-up evaluation input parameters
   * @returns Structured feedback with pass/fail determination
   */
  async evaluateFollowUp(input: EvaluateFollowUpInput): Promise<LLMFeedbackResponse> {
    const userConfig = await getLLMConfigWithUserFallback();
    const strictness = userConfig.strictnessLevel || 'DEFAULT';

    const prompt = getEvaluateFollowUpPrompt(
      input.originalQuestion,
      input.followUpQuestion,
      input.userAnswer,
      strictness,
    );

    return withRetry(async () => {
      try {
        const content = await this.callLLM([
          { role: 'user', content: prompt },
        ], userConfig);

        const parsed = extractJSON(content);
        return validateFeedbackResponse(parsed);
      } catch (error) {
        // If parsing fails, try again with clarifying instruction
        if (error instanceof LLMParseError || error instanceof SyntaxError) {
          const clarifiedContent = await this.callLLM([
            { role: 'user', content: prompt },
            { role: 'assistant', content: error instanceof Error ? error.message : 'Invalid JSON' },
            { role: 'user', content: CLARIFYING_INSTRUCTION },
          ], userConfig);

          const parsed = extractJSON(clarifiedContent);
          return validateFeedbackResponse(parsed);
        }
        throw error;
      }
    }, userConfig.retry, 'evaluateFollowUp');
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
  testConnection: () => llmService.testConnection(),
  evaluateAnswer: (input: EvaluateAnswerInput) => llmService.evaluateAnswer(input),
  evaluateFollowUp: (input: EvaluateFollowUpInput) => llmService.evaluateFollowUp(input),
  generateQuestions: (input: GenerateQuestionsInput) => llmService.generateQuestions(input),
  generateFollowUp: (input: GenerateFollowUpInput) => llmService.generateFollowUp(input),
} as const;

export type LLMServiceInterface = typeof LLMServiceInterface;
