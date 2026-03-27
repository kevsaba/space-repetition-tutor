/**
 * LLM Service Types
 *
 * Type definitions for LLM requests and responses.
 */

/**
 * Difficulty levels for questions
 */
export type QuestionDifficulty = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT';

/**
 * Question types
 */
export type QuestionType = 'CONCEPTUAL' | 'CODING' | 'DESIGN';

/**
 * Session modes
 */
export type SessionMode = 'FREE' | 'INTERVIEW';

/**
 * Structured feedback from LLM evaluation
 */
export interface LLMFeedback {
  evaluation: string;
  higherLevelArticulation: string;
  correction: string;
  failureTimeline: string;
  interviewReadyAnswer: string;
  analogy: string;
  productionInsight: string;
}

/**
 * Response from LLM when evaluating an answer
 */
export interface LLMFeedbackResponse {
  passed: boolean;
  feedback: LLMFeedback;
}

/**
 * Input for answer evaluation
 */
export interface EvaluateAnswerInput {
  question: string;
  userAnswer: string;
  currentBox: number;
}

/**
 * Generated question from LLM
 */
export interface GeneratedQuestion {
  content: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  expectedTopics: string[];
  hint?: string;
}

/**
 * Response from LLM when generating questions
 */
export interface LLMQuestionResponse {
  questions: GeneratedQuestion[];
}

/**
 * Input for question generation
 */
export interface GenerateQuestionsInput {
  topic: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  count?: number;
  customPrompt?: string;
}

/**
 * Follow-up question from LLM
 */
export interface FollowUpQuestion {
  content: string;
  reason: string;
}

/**
 * Response from LLM when generating follow-ups
 */
export interface LLMFollowUpResponse {
  followUpQuestions: FollowUpQuestion[];
}

/**
 * Input for follow-up generation
 */
export interface GenerateFollowUpInput {
  originalQuestion: string;
  userAnswer: string;
  passed: boolean;
  mode: SessionMode;
}

/**
 * Input for evaluating follow-up answer
 */
export interface EvaluateFollowUpInput {
  originalQuestion: string;
  followUpQuestion: string;
  userAnswer: string;
}

/**
 * Response from evaluating follow-up answer (same structure as original evaluation)
 */
export type LLMFollowUpEvaluationResponse = LLMFeedbackResponse;

/**
 * LLM API request format
 */
export interface LLMApiRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * LLM API response format
 */
export interface LLMApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  timeout: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  timeout: 30000,
};
