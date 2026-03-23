# Question Generation Prompt

**Purpose:** Generate interview questions for a given topic and difficulty level.

**Prompt Template:**

```
You are generating interview questions for: {topic}

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
}
```

**Variables:**
- `topic` - The topic to generate questions for (e.g., "Java Concurrency")
- `difficulty` - Target difficulty level (JUNIOR, MID, SENIOR)
- `type` - Question type (CONCEPTUAL, CODING, DESIGN)
- `count` - Number of questions to generate (default: 1-3)

**Expected Response Format:**

```typescript
interface LLMQuestionResponse {
  questions: Array<{
    content: string;          // The question text
    difficulty: 'JUNIOR' | 'MID' | 'SENIOR';
    type: 'CONCEPTUAL' | 'CODING' | 'DESIGN';
    expectedTopics: string[]; // Topics this question covers
    hint?: string;            // Optional hint
  }>;
}
```

**Example Request:**

```
Topic: Java Concurrency
Difficulty: MID
Type: CONCEPTUAL
Count: 2
```

**Example Response:**

```json
{
  "questions": [
    {
      "content": "Explain the difference between synchronized blocks and ReentrantLock in Java. When would you choose one over the other?",
      "difficulty": "MID",
      "type": "CONCEPTUAL",
      "expectedTopics": ["concurrency", "synchronization", "locks"],
      "hint": "Consider fairness, interruptibility, and tryLock capabilities"
    },
    {
      "content": "What is the Java Memory Model and how does it affect concurrent programming? Explain happens-before relationships.",
      "difficulty": "MID",
      "type": "CONCEPTUAL",
      "expectedTopics": ["JMM", "memory visibility", "happens-before"],
      "hint": "Think about volatile, final fields, and synchronization rules"
    }
  ]
}
```

**Validation Rules:**
- Response MUST be valid JSON
- `questions` array MUST contain exactly `count` items
- Each question MUST have non-empty `content`
- `difficulty` and `type` MUST match valid enum values
- `expectedTopics` MUST be a non-empty array

**Error Handling:**
- If JSON parsing fails: retry once with clarifying instruction
- If validation fails: retry with stricter format requirements
- If retry fails: use fallback template questions from database

**Notes for Implementation:**
- Always generate fresh questions via LLM (no pre-seeded pool for v1)
- Store generated questions as templates (can be reused for other users)
- Questions should be interview-relevant and production-oriented
- Avoid syntax trivia and toy examples
