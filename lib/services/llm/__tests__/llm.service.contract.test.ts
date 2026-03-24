/**
 * LLM Service Contract Tests
 *
 * Tests for validating LLM response formats and schemas.
 * These tests ensure the service handles various response formats correctly.
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateFeedbackResponse,
  validateQuestionResponse,
  validateFollowUpResponse,
  extractJSON,
} from '../validation';
import {
  LLMFeedbackResponse,
  LLMQuestionResponse,
  LLMFollowUpResponse,
} from '../types';
import { LLMValidationError, LLMParseError } from '../errors';

describe('LLM Response Validation', () => {
  describe('validateFeedbackResponse', () => {
    const validFeedbackResponse: LLMFeedbackResponse = {
      passed: true,
      feedback: {
        evaluation: 'Good answer covering key points.',
        higherLevelArticulation: 'At senior level, connect to architectural patterns.',
        correction: 'Minor clarification needed.',
        failureTimeline: 'Without this, you might miss optimization opportunities.',
        interviewReadyAnswer: 'Condensed: X is Y because it does Z.',
        analogy: 'Like a lock ensuring single-threaded access.',
        productionInsight: 'Critical for distributed systems.',
      },
    };

    it('should validate a correct feedback response', () => {
      const result = validateFeedbackResponse(validFeedbackResponse);
      expect(result).toEqual(validFeedbackResponse);
    });

    it('should require all feedback fields', () => {
      const invalid = {
        passed: true,
        feedback: {
          evaluation: 'test',
          // missing other fields
        },
      };
      expect(() => validateFeedbackResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should require non-empty strings for feedback fields', () => {
      const invalid = {
        ...validFeedbackResponse,
        feedback: {
          ...validFeedbackResponse.feedback,
          evaluation: '',
        },
      };
      expect(() => validateFeedbackResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should validate passed as boolean', () => {
      const invalid = {
        ...validFeedbackResponse,
        passed: 'true' as unknown as boolean,
      };
      expect(() => validateFeedbackResponse(invalid)).toThrow(LLMValidationError);
    });
  });

  describe('validateQuestionResponse', () => {
    const validQuestionResponse: LLMQuestionResponse = {
      questions: [
        {
          content: 'Explain the difference between process and thread.',
          difficulty: 'MID',
          type: 'CONCEPTUAL',
          expectedTopics: ['concurrency', 'os'],
          hint: 'Consider memory isolation and resource sharing',
        },
      ],
    };

    it('should validate a correct question response', () => {
      const result = validateQuestionResponse(validQuestionResponse);
      expect(result).toEqual(validQuestionResponse);
    });

    it('should require at least one question', () => {
      const invalid = { questions: [] };
      expect(() => validateQuestionResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should require non-empty content', () => {
      const invalid = {
        questions: [
          {
            content: '',
            difficulty: 'MID' as const,
            type: 'CONCEPTUAL' as const,
            expectedTopics: ['test'],
          },
        ],
      };
      expect(() => validateQuestionResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should require valid difficulty enum', () => {
      const invalid = {
        questions: [
          {
            content: 'test',
            difficulty: 'INVALID' as 'MID',
            type: 'CONCEPTUAL' as const,
            expectedTopics: ['test'],
          },
        ],
      };
      expect(() => validateQuestionResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should require valid type enum', () => {
      const invalid = {
        questions: [
          {
            content: 'test',
            difficulty: 'MID' as const,
            type: 'INVALID' as 'CONCEPTUAL',
            expectedTopics: ['test'],
          },
        ],
      };
      expect(() => validateQuestionResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should require non-empty expectedTopics array', () => {
      const invalid = {
        questions: [
          {
            content: 'test',
            difficulty: 'MID' as const,
            type: 'CONCEPTUAL' as const,
            expectedTopics: [],
          },
        ],
      };
      expect(() => validateQuestionResponse(invalid)).toThrow(LLMValidationError);
    });

    it('should allow optional hint field', () => {
      const withoutHint = {
        questions: [
          {
            content: 'test',
            difficulty: 'MID' as const,
            type: 'CONCEPTUAL' as const,
            expectedTopics: ['test'],
          },
        ],
      };
      const result = validateQuestionResponse(withoutHint);
      expect(result.questions[0].hint).toBeUndefined();
    });
  });

  describe('validateFollowUpResponse', () => {
    const validFollowUpResponse: LLMFollowUpResponse = {
      followUpQuestions: [
        {
          content: 'Can you elaborate on the practical applications?',
          reason: 'Testing deeper understanding',
        },
      ],
    };

    it('should validate a correct follow-up response', () => {
      const result = validateFollowUpResponse(validFollowUpResponse);
      expect(result).toEqual(validFollowUpResponse);
    });

    it('should allow empty follow-up array', () => {
      const empty = { followUpQuestions: [] };
      const result = validateFollowUpResponse(empty);
      expect(result.followUpQuestions).toEqual([]);
    });

    it('should limit to 2 follow-up questions', () => {
      const tooMany = {
        followUpQuestions: [
          { content: 'q1', reason: 'r1' },
          { content: 'q2', reason: 'r2' },
          { content: 'q3', reason: 'r3' },
        ],
      };
      expect(() => validateFollowUpResponse(tooMany)).toThrow(LLMValidationError);
    });

    it('should require non-empty content and reason', () => {
      const invalid = {
        followUpQuestions: [
          { content: '', reason: 'test' },
        ],
      };
      expect(() => validateFollowUpResponse(invalid)).toThrow(LLMValidationError);
    });
  });
});

describe('JSON Extraction', () => {
  describe('extractJSON', () => {
    it('should extract JSON from plain response', () => {
      const input = '{"passed":true,"feedback":{"evaluation":"test"}}';
      const result = extractJSON(input);
      expect(result).toEqual({ passed: true, feedback: { evaluation: 'test' } });
    });

    it('should extract JSON from markdown code block', () => {
      const input = '```json\n{"passed":true,"feedback":{"evaluation":"test"}}\n```';
      const result = extractJSON(input);
      expect(result).toEqual({ passed: true, feedback: { evaluation: 'test' } });
    });

    it('should extract JSON from markdown code block without language tag', () => {
      const input = '```\n{"passed":true}\n```';
      const result = extractJSON(input);
      expect(result).toEqual({ passed: true });
    });

    it('should extract JSON from text with surrounding content', () => {
      const input = 'Here is the response:\n{"passed":true}\nThat was the response.';
      const result = extractJSON(input);
      expect(result).toEqual({ passed: true });
    });

    it('should extract array JSON', () => {
      const input = '{"questions":[{"content":"q1"}]}';
      const result = extractJSON(input);
      expect(result).toEqual({ questions: [{ content: 'q1' }] });
    });

    it('should throw error for invalid JSON', () => {
      const input = '{invalid json}';
      expect(() => extractJSON(input)).toThrow();
    });

    it('should throw error for empty string', () => {
      expect(() => extractJSON('')).toThrow();
    });

    it('should handle nested objects', () => {
      const input = '{"passed":true,"feedback":{"evaluation":"test","nested":{"value":123}}}';
      const result = extractJSON(input);
      expect(result).toEqual({
        passed: true,
        feedback: { evaluation: 'test', nested: { value: 123 } },
      });
    });

    it('should handle whitespace in JSON', () => {
      const input = `
        {
          "passed": true,
          "feedback": {
            "evaluation": "test"
          }
        }
      `;
      const result = extractJSON(input);
      expect(result).toEqual({
        passed: true,
        feedback: { evaluation: 'test' },
      });
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle null feedback fields gracefully when validation disabled', () => {
    // This test documents current behavior - null values will fail Zod validation
    const invalid = {
      passed: true,
      feedback: {
        evaluation: null as unknown as string,
        higherLevelArticulation: 'test',
        correction: 'test',
        failureTimeline: 'test',
        interviewReadyAnswer: 'test',
        analogy: 'test',
        productionInsight: 'test',
      },
    };
    expect(() => validateFeedbackResponse(invalid)).toThrow(LLMValidationError);
  });

  it('should handle undefined fields in nested objects', () => {
    const invalid = {
      passed: true,
      feedback: {
        evaluation: 'test',
        higherLevelArticulation: undefined as unknown as string,
        correction: 'test',
        failureTimeline: 'test',
        interviewReadyAnswer: 'test',
        analogy: 'test',
        productionInsight: 'test',
      },
    };
    expect(() => validateFeedbackResponse(invalid)).toThrow(LLMValidationError);
  });

  it('should handle very long feedback strings', () => {
    const longText = 'a'.repeat(10000);
    const valid = {
      passed: true,
      feedback: {
        evaluation: longText,
        higherLevelArticulation: longText,
        correction: longText,
        failureTimeline: longText,
        interviewReadyAnswer: longText,
        analogy: longText,
        productionInsight: longText,
      },
    };
    const result = validateFeedbackResponse(valid);
    expect(result.feedback.evaluation).toBe(longText);
  });

  it('should handle special characters in content', () => {
    const specialChars = 'Test with "quotes" and \'apostrophes\' and \n newlines \t tabs';
    const valid = {
      passed: true,
      feedback: {
        evaluation: specialChars,
        higherLevelArticulation: specialChars,
        correction: specialChars,
        failureTimeline: specialChars,
        interviewReadyAnswer: specialChars,
        analogy: specialChars,
        productionInsight: specialChars,
      },
    };
    const result = validateFeedbackResponse(valid);
    expect(result.feedback.evaluation).toContain('quotes');
  });
});
