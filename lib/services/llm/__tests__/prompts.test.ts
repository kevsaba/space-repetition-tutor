/**
 * Unit tests for LLM Prompts with strictness levels
 *
 * Tests prompt generation with different strictness levels:
 * - DEFAULT
 * - STRICT
 * - LENIENT
 */

import { describe, it, expect } from '@jest/globals';
import {
  getEvaluateAnswerPrompt,
  getEvaluateFollowUpPrompt,
  getStrictnessGuidance,
  getGenerateQuestionsPrompt,
  getGenerateFollowUpPrompt,
} from '../prompts';

describe('LLM Prompts - Strictness Levels', () => {
  describe('getStrictnessGuidance', () => {
    it('should return DEFAULT guidance', () => {
      const guidance = getStrictnessGuidance('DEFAULT');
      expect(guidance).toContain('balanced standard');
      expect(guidance).toContain('core concept MUST be correctly understood');
      expect(guidance).toContain('Critical points MUST be covered');
    });

    it('should return STRICT guidance', () => {
      const guidance = getStrictnessGuidance('STRICT');
      expect(guidance).toContain('high precision and rigor');
      expect(guidance).toContain('ALL important details MUST be covered');
      expect(guidance).toContain('interview-ready articulation');
    });

    it('should return LENIENT guidance', () => {
      const guidance = getStrictnessGuidance('LENIENT');
      expect(guidance).toContain('focus on core understanding');
      expect(guidance).toContain('main concept MUST be correctly understood');
      expect(guidance).toContain('Minor omissions of details are acceptable');
    });
  });

  describe('getEvaluateAnswerPrompt', () => {
    const question = 'Explain the difference between ArrayList and LinkedList in Java.';
    const userAnswer = 'ArrayList uses dynamic array, LinkedList uses nodes with references.';
    const currentBox = 2;

    it('should include DEFAULT strictness in prompt', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'DEFAULT');
      expect(prompt).toContain('Strictness: DEFAULT');
      expect(prompt).toContain('balanced standard');
    });

    it('should include STRICT strictness in prompt', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'STRICT');
      expect(prompt).toContain('Strictness: STRICT');
      expect(prompt).toContain('high precision and rigor');
    });

    it('should include LENIENT strictness in prompt', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'LENIENT');
      expect(prompt).toContain('Strictness: LENIENT');
      expect(prompt).toContain('focus on core understanding');
    });

    it('should default to DEFAULT when strictness not provided', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox);
      expect(prompt).toContain('Strictness: DEFAULT');
    });

    it('should include question and answer in prompt', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'DEFAULT');
      expect(prompt).toContain(`Question: ${question}`);
      expect(prompt).toContain(`Candidate's Answer: ${userAnswer}`);
    });

    it('should include current box level in prompt', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'DEFAULT');
      expect(prompt).toContain(`Current Box: ${currentBox}`);
    });

    it('should include JSON response format', () => {
      const prompt = getEvaluateAnswerPrompt(question, userAnswer, currentBox, 'STRICT');
      expect(prompt).toContain('"passed": true/false');
      expect(prompt).toContain('"feedback":');
    });
  });

  describe('getEvaluateFollowUpPrompt', () => {
    const originalQuestion = 'Explain the difference between ArrayList and LinkedList in Java.';
    const followUpQuestion = 'Which one would you use for a frequently resizing list?';
    const userAnswer = 'ArrayList because it has better cache locality and random access is O(1).';

    it('should include DEFAULT strictness in follow-up prompt', () => {
      const prompt = getEvaluateFollowUpPrompt(originalQuestion, followUpQuestion, userAnswer, 'DEFAULT');
      expect(prompt).toContain('Strictness: DEFAULT');
      expect(prompt).toContain('balanced standard');
    });

    it('should include STRICT strictness in follow-up prompt', () => {
      const prompt = getEvaluateFollowUpPrompt(originalQuestion, followUpQuestion, userAnswer, 'STRICT');
      expect(prompt).toContain('Strictness: STRICT');
      expect(prompt).toContain('high precision and rigor');
    });

    it('should include LENIENT strictness in follow-up prompt', () => {
      const prompt = getEvaluateFollowUpPrompt(originalQuestion, followUpQuestion, userAnswer, 'LENIENT');
      expect(prompt).toContain('Strictness: LENIENT');
      expect(prompt).toContain('focus on core understanding');
    });

    it('should default to DEFAULT when strictness not provided', () => {
      const prompt = getEvaluateFollowUpPrompt(originalQuestion, followUpQuestion, userAnswer);
      expect(prompt).toContain('Strictness: DEFAULT');
    });

    it('should include all context in follow-up prompt', () => {
      const prompt = getEvaluateFollowUpPrompt(originalQuestion, followUpQuestion, userAnswer, 'DEFAULT');
      expect(prompt).toContain(`Original Question: ${originalQuestion}`);
      expect(prompt).toContain(`Follow-up Question: ${followUpQuestion}`);
      expect(prompt).toContain(`Candidate's Follow-up Answer: ${userAnswer}`);
    });
  });

  describe('getGenerateQuestionsPrompt', () => {
    it('should generate questions prompt without strictness', () => {
      const prompt = getGenerateQuestionsPrompt('Java Concurrency', 'MID', 'CONCEPTUAL', 3);
      expect(prompt).toContain('Java Concurrency');
      expect(prompt).toContain('Difficulty: MID');
      expect(prompt).toContain('Type: CONCEPTUAL');
      expect(prompt).toContain('Generate 3 questions');
    });

    it('should handle different difficulty levels', () => {
      const prompt = getGenerateQuestionsPrompt('Databases', 'SENIOR', 'DESIGN', 5);
      expect(prompt).toContain('Difficulty: SENIOR');
      expect(prompt).toContain('Type: DESIGN');
      expect(prompt).toContain('Generate 5 questions');
    });
  });

  describe('getGenerateFollowUpPrompt', () => {
    it('should generate follow-up prompt without strictness', () => {
      const prompt = getGenerateFollowUpPrompt(
        'What is polymorphism?',
        'Its when objects can take many forms.',
        false,
        'FREE'
      );
      expect(prompt).toContain('Original Question: What is polymorphism?');
      expect(prompt).toContain('Evaluation: false');
      expect(prompt).toContain('Mode: FREE');
    });
  });

  describe('Strictness Guidance Content', () => {
    it('should have distinct guidance for each level', () => {
      const defaultGuidance = getStrictnessGuidance('DEFAULT');
      const strictGuidance = getStrictnessGuidance('STRICT');
      const lenientGuidance = getStrictnessGuidance('LENIENT');

      // Each guidance should be unique
      expect(defaultGuidance).not.toBe(strictGuidance);
      expect(defaultGuidance).not.toBe(lenientGuidance);
      expect(strictGuidance).not.toBe(lenientGuidance);
    });

    it('should mention non-negotiable core concept in all levels', () => {
      const levels: Array<'DEFAULT' | 'STRICT' | 'LENIENT'> = ['DEFAULT', 'STRICT', 'LENIENT'];

      levels.forEach(level => {
        const guidance = getStrictnessGuidance(level);
        // All levels require core concept understanding
        if (level === 'LENIENT') {
          expect(guidance).toContain('main concept MUST be correctly understood');
        } else {
          expect(guidance).toContain('core concept MUST be correctly understood');
        }
      });
    });
  });
});
