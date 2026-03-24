# Follow-Up Question Generation Prompt

**Purpose:** Generate relevant follow-up questions based on user's answer.

**Prompt Template:**

```
Original Question: {originalQuestion}
Candidate's Answer: {userAnswer}
Evaluation: {passed} (true/false)
Mode: {mode} (FREE or INTERVIEW)

**CRITICAL EVALUATION GUIDELINE:**
When generating follow-ups, assess the candidate's answer by CLEARLY DISTINGUISHING between:
- **REASONING CORRECTNESS** - Is the underlying logic/understanding correct?
- **WORDING PRECISION** - Are they using the exact terminology?

If reasoning is CORRECT (even if wording is imprecise):
- Do NOT generate follow-ups that test the same concept again
- Consider follow-ups that explore related advanced topics
- Focus on deepening their understanding, not re-testing the basics

If reasoning has GAPS or is INCORRECT:
- Generate follow-ups that probe the misunderstanding
- Ask questions that would reveal the gap in their knowledge
- Test foundational concepts they may be missing

Generate up to 2 follow-up questions that:
1. Dig deeper into REASONING GAPS (not just wording issues)
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

If the answer was perfect and no follow-ups are needed, return empty array.
```

**Variables:**
- `originalQuestion` - The original question text
- `userAnswer` - The user's answer
- `passed` - Whether the answer passed evaluation
- `mode` - Study mode (FREE or INTERVIEW)

**Expected Response Format:**

```typescript
interface LLMFollowUpResponse {
  followUpQuestions: Array<{
    content: string;  // Follow-up question text
    reason: string;   // Why this follow-up is relevant
  }>;
}
```

**Follow-Up Strategy:**

| Scenario | Follow-Up Approach |
|----------|-------------------|
| Answer incomplete/partial | Dig deeper into missing details |
| Answer shows confusion | Test related foundational concepts |
| Answer is good but basic | Explore advanced nuances |
| Answer is excellent | Return empty array (no follow-up needed) |
| Answer shows misconception | Test understanding of related concept that would clarify |

**Example Request:**

```
Original Question: Explain the difference between synchronized blocks and ReentrantLock in Java.
Candidate's Answer: Synchronized is built into the language and automatically handles locking. ReentrantLock is more explicit and has features like tryLock() and fair locking. I'd use ReentrantLock when I need those extra features.
Evaluation: true (passed)
Mode: FREE
```

**Example Response:**

```json
{
  "followUpQuestions": [
    {
      "content": "You mentioned fair locking - what's the performance trade-off between fair and unfair locking, and when would you accept the throughput cost?",
      "reason": "Tests understanding of fair locking implications and whether candidate can reason about trade-offs."
    },
    {
      "content": "How does the JVM handle synchronized blocks under the hood? What happens when contention occurs?",
      "reason": "Tests deeper knowledge of synchronized implementation and optimization techniques like biased locking and lock elision."
    }
  ]
}
```

**Example Request (Poor Answer):**

```
Original Question: What is the Java Memory Model?
Candidate's Answer: It's about how Java manages memory allocation and garbage collection.
Evaluation: false (did not pass - this is incorrect)
Mode: FREE
```

**Example Response:**

```json
{
  "followUpQuestions": [
    {
      "content": "Let's clarify: The JMM isn't about GC. Have you heard of 'happens-before' relationships? Can you explain what volatile guarantees in Java?",
      "reason": "Candidate confused JMM with memory management. Testing if they're familiar with core JMM concepts like visibility and ordering."
    },
    {
      "content": "Why might a thread not see updates made by another thread, even though the code looks correct?",
      "reason": "Practical scenario that demonstrates JMM importance, tests if they understand memory visibility issues."
    }
  ]
}
```

**Example Request (Excellent Answer - No Follow-up):**

```
Original Question: Explain how HashMap works in Java.
Candidate's Answer: [Comprehensive answer covering hash function, bucket array, linked list -> tree conversion, equals/hashCode contract, collision handling, resize threshold, etc.]
Evaluation: true (passed with excellence)
Mode: INTERVIEW
```

**Example Response:**

```json
{
  "followUpQuestions": []
}
```

**Validation Rules:**
- Response MUST be valid JSON
- MUST return 0, 1, or 2 follow-up questions
- Each follow-up MUST be relevant to original topic
- `reason` field MUST explain the value of the follow-up

**Error Handling:**
- If JSON parsing fails: retry once
- If more than 2 questions returned: take first 2
- If questions drift from topic: retry with explicit instruction to stay on topic

**Important Notes:**
- Follow-ups happen after EVERY question in both FREE and INTERVIEW modes
- Each follow-up is evaluated independently
- If ALL follow-ups pass: original question promotes
- If ANY follow-up fails: original question stays in Box 1 (or demotes to Box 1)
- Follow-ups should feel like natural interview flow, not random topic switches

**Interview Mode vs Free Mode:**
- **FREE**: More exploratory follow-ups, can dig into interesting tangents
- **INTERVIEW**: Stay focused on core interview requirements, time-constrained
