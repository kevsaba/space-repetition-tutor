/**
 * Mock LLM Service for Testing
 *
 * Implements the same interface as LLMService but returns predefined responses.
 * Used for testing without making actual LLM API calls.
 */

import type {
  EvaluateAnswerInput,
  LLMFeedbackResponse,
  GenerateQuestionsInput,
  LLMQuestionResponse,
  GenerateFollowUpInput,
  LLMFollowUpResponse,
  QuestionDifficulty,
  QuestionType,
} from './types';
import { LLMTimeoutError, LLMValidationError } from './errors';

/**
 * Mock feedback for perfect answers
 */
const PERFECT_FEEDBACK = {
  evaluation: 'Excellent answer! You covered all the key points with clarity and precision.',
  higherLevelArticulation: 'At senior level, you could elaborate more on edge cases and trade-offs.',
  correction: 'N/A',
  failureTimeline: 'N/A',
  interviewReadyAnswer: 'Your answer is already interview-ready. Well done!',
  analogy: 'N/A',
  productionInsight: 'This knowledge directly applies to real-world scenarios where X affects Y.',
};

/**
 * Mock feedback for good answers with minor gaps
 */
const GOOD_FEEDBACK = {
  evaluation: 'Good answer! You demonstrated solid understanding of the core concepts.',
  higherLevelArticulation: 'To phrase this at senior level, connect it to broader architectural patterns.',
  correction: 'Minor clarification: You mentioned X, but it would be more accurate to say Y.',
  failureTimeline: 'Without this nuance, you might make suboptimal decisions in edge cases.',
  interviewReadyAnswer: 'Condensed version: Key concept is X, which impacts Y in production systems.',
  analogy: 'Think of it like a car engine - you understand the basics, but senior mechanics know the vibrations.',
  productionInsight: 'In production, this distinction matters when dealing with high-throughput scenarios.',
};

/**
 * Mock feedback for poor answers
 */
const POOR_FEEDBACK = {
  evaluation: 'Your answer shows some familiarity but lacks depth and technical accuracy.',
  higherLevelArticulation: 'N/A - need to strengthen fundamentals first.',
  correction: 'Key misconception: You described X as Y, but actually X is Z because...',
  failureTimeline: 'Without this knowledge, you might struggle with system design interviews and miss optimization opportunities.',
  interviewReadyAnswer: 'The correct answer is: X is Z because it does A and B in context C.',
  analogy: 'Think of X like a lock - it ensures only one thread accesses critical resources.',
  productionInsight: 'This is critical in distributed systems where race conditions can cause data corruption.',
};

/**
 * Mock LLM Service
 */
export class MockLLMService {
  constructor(
    private config: {
      shouldTimeout?: boolean;
      shouldError?: boolean;
      forceResponse?: 'pass' | 'fail' | 'error';
      delay?: number;
    } = {},
  ) {}

  /**
   * Simulate delay if configured
   */
  private async delay(): Promise<void> {
    if (this.config.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay));
    }
  }

  /**
   * Throw timeout if configured
   */
  private checkTimeout(): void {
    if (this.config.shouldTimeout) {
      throw new LLMTimeoutError('Mock timeout');
    }
  }

  /**
   * Throw error if configured
   */
  private checkError(): void {
    if (this.config.shouldError) {
      throw new Error('Mock LLM error');
    }
  }

  /**
   * Evaluate a user's answer
   */
  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LLMFeedbackResponse> {
    await this.delay();
    this.checkTimeout();
    this.checkError();

    let passed: boolean;
    let feedback: LLMFeedbackResponse['feedback'];

    if (this.config.forceResponse === 'fail') {
      passed = false;
      feedback = POOR_FEEDBACK;
    } else if (this.config.forceResponse === 'pass') {
      passed = true;
      feedback = PERFECT_FEEDBACK;
    } else if (this.config.forceResponse === 'error') {
      throw new Error('Forced error');
    } else {
      // Auto-determine based on answer quality
      const hasContent = input.userAnswer.length > 20;
      const hasKeywords = /because|however|therefore|although|example|explicit|fair|scheduling|acquisition/.test(input.userAnswer.toLowerCase());

      passed = hasContent && hasKeywords;
      feedback = passed
        ? (hasKeywords ? PERFECT_FEEDBACK : GOOD_FEEDBACK)
        : POOR_FEEDBACK;
    }

    return {
      passed,
      feedback: {
        ...feedback,
        evaluation: this.customizeFeedback(feedback.evaluation, input),
      },
    };
  }

  /**
   * Generate new questions
   */
  async generateQuestions(input: GenerateQuestionsInput): Promise<LLMQuestionResponse> {
    await this.delay();
    this.checkTimeout();
    this.checkError();

    const count = input.count || 1;

    const questions = Array.from({ length: count }, (_, i) => ({
      content: `Mock question ${i + 1} about ${input.topic} (${input.difficulty} level)`,
      difficulty: input.difficulty,
      type: input.type,
      expectedTopics: [input.topic, 'related-concept'],
      hint: i === 0 ? 'Consider the core principles' : undefined,
    }));

    return { questions };
  }

  /**
   * Generate follow-up questions
   */
  async generateFollowUp(input: GenerateFollowUpInput): Promise<LLMFollowUpResponse> {
    await this.delay();
    this.checkTimeout();
    this.checkError();

    // Generate follow-ups only for imperfect answers
    if (input.passed && input.userAnswer.length > 100) {
      return { followUpQuestions: [] };
    }

    return {
      followUpQuestions: [
        {
          content: `Can you elaborate on how ${input.originalQuestion.split(' ').slice(0, 3).join(' ')}... applies in practice?`,
          reason: 'Testing practical application of the concept.',
        },
        {
          content: 'What are the potential edge cases or limitations?',
          reason: 'Senior engineers understand trade-offs and limitations.',
        },
      ].slice(0, input.passed ? 1 : 2),
    };
  }

  /**
   * Customize feedback with question-specific context
   */
  private customizeFeedback(template: string, input: EvaluateAnswerInput): string {
    return template;
  }
}

/**
 * Create a mock LLM service with specific configuration
 */
export function createMockLLMService(config: {
  shouldTimeout?: boolean;
  shouldError?: boolean;
  forceResponse?: 'pass' | 'fail' | 'error';
  delay?: number;
}): MockLLMService {
  return new MockLLMService(config);
}

/**
 * Default mock LLM service (passes reasonable answers)
 */
export const mockLLMService = new MockLLMService();

/**
 * Mock service that always passes
 */
export const passingMockLLMService = new MockLLMService({ forceResponse: 'pass' });

/**
 * Mock service that always fails
 */
export const failingMockLLMService = new MockLLMService({ forceResponse: 'fail' });

/**
 * Mock service that times out
 */
export const timeoutMockLLMService = new MockLLMService({ shouldTimeout: true });

/**
 * Mock service that throws errors
 */
export const errorMockLLMService = new MockLLMService({ shouldError: true });
