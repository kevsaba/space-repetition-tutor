# LLM Strictness Levels

The Space Repetition Tutor supports three evaluation strictness levels that control how the AI grades your answers. This allows you to customize the learning experience based on your confidence level and study goals.

## Overview

When you answer a question, the LLM evaluates your response based on the selected strictness level. This affects:
- Whether your answer is marked as **PASS** or **FAIL**
- How detailed your explanation needs to be
- How much feedback you receive
- How quickly you progress through the Leitner boxes

## The Three Levels

### 🎯 DEFAULT (Recommended)

**Best for:** Most users, balanced learning

**Evaluation criteria:**
- The core concept MUST be correctly understood
- Critical points MUST be covered (omitting important details will FAIL)
- Minor wording issues are acceptable
- Good explanations that miss some secondary details will PASS
- Box 1 requires basic understanding, Box 3 requires nuanced senior-level articulation

**Example:**
> **Question:** "Explain the difference between ArrayList and LinkedList in Java."
>
> **Answer:** "ArrayList uses an array internally, LinkedList uses nodes with pointers. ArrayList has O(1) random access but is slow for insertions. LinkedList has O(n) access but fast insertions."
>
> **Result:** ✅ PASS - Covers core concepts and key differences

---

### 😌 LENIENT

**Best for:** Building confidence, learning new topics, reducing anxiety

**Evaluation criteria:**
- The main concept MUST be correctly understood (non-negotiable)
- Minor omissions of details are acceptable
- Wording and communication style are secondary to conceptual understanding
- If the answer demonstrates knowledge of the topic and key concepts, it will PASS
- Good for building confidence while still ensuring learning

**Example:**
> **Question:** "Explain the difference between ArrayList and LinkedList in Java."
>
> **Answer:** "ArrayList uses an array and LinkedList uses nodes. ArrayList is faster for reading, LinkedList is better for adding things."
>
> **Result:** ✅ PASS - Core concept is correct despite informal wording

---

### 🏆 STRICT

**Best for:** Interview preparation, ensuring comprehensive knowledge

**Evaluation criteria:**
- The core concept MUST be correctly understood
- ALL important details MUST be covered
- Communication should be clear, precise, and professional
- Missing any critical point will FAIL
- Incomplete or vague explanations will FAIL
- Expects interview-ready articulation at all box levels

**Example:**
> **Question:** "Explain the difference between ArrayList and LinkedList in Java."
>
> **Answer:** "ArrayList uses an array internally, LinkedList uses nodes with pointers. ArrayList has O(1) random access but is slow for insertions. LinkedList has O(n) access but fast insertions."
>
> **Result:** ❌ FAIL - Missing memory overhead, cache locality, iterator behavior, concrete use cases

---

## Comparison Table

| Aspect | LENIENT | DEFAULT | STRICT |
|--------|---------|---------|--------|
| **Core concept** | Must be correct | Must be correct | Must be correct |
| **Missing details** | Acceptable | Some OK, critical = fail | Any important = fail |
| **Wording/communication** | Secondary | Minor issues OK | Must be professional |
| **Vague explanations** | Usually PASS | Usually FAIL | Definitely FAIL |
| **Box level expectations** | Same for all | Box 1: basic, Box 3: nuanced | Interview-ready at all levels |
| **Use case** | Building confidence | Daily practice | Interview prep |

## How It Works

### Technical Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                        User Flow                             │
│                                                              │
│  Settings → Select Strictness → Save to Database           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Evaluation Pipeline                     │
│                                                              │
│  1. User submits answer                                     │
│  2. Fetch user's strictness level from database            │
│  3. Get appropriate prompt template based on level         │
│  4. Send prompt + answer to LLM                            │
│  5. LLM returns PASS/FAIL with feedback                     │
└─────────────────────────────────────────────────────────────┘
```

### Prompt Differences

The actual prompts sent to the LLM vary by strictness level:

**LENIENT Prompt Addition:**
```
Evaluate with focus on core understanding:
- The main concept MUST be correctly understood (this is non-negotiable)
- Minor omissions of details are acceptable
- Wording and communication style are secondary to conceptual understanding
- If the answer demonstrates they know the topic and key concepts, it should PASS
- Good for building confidence while still ensuring learning.
```

**DEFAULT Prompt Addition:**
```
Evaluate based on a balanced standard:
- The core concept MUST be correctly understood
- Critical points MUST be covered (omitting important details should FAIL)
- Minor wording issues are acceptable
- Good explanations that miss some secondary details should PASS
- Box 1 requires basic understanding. Box 3 requires nuanced, senior-level articulation.
```

**STRICT Prompt Addition:**
```
Evaluate with high precision and rigor:
- The core concept MUST be correctly understood
- ALL important details MUST be covered
- Communication should be clear, precise, and professional
- Missing any critical point should FAIL
- Incomplete or vague explanations should FAIL
- Expects interview-ready articulation at all box levels.
```

## Database Schema

```prisma
enum StrictnessLevel {
  DEFAULT
  STRICT
  LENIENT
}

model UserLlmConfig {
  // ... other fields
  strictnessLevel  StrictnessLevel    @default(DEFAULT)
}
```

## API Endpoints

### GET /api/user/llm-config
Returns the user's current LLM configuration including strictness level.

### POST /api/user/llm-config
Saves the user's LLM configuration. Body includes:
```json
{
  "strictnessLevel": "STRICT",  // or "DEFAULT" or "LENIENT"
  "apiUrl": "...",
  "apiKey": "...",
  "model": "...",
  "storagePreference": "SESSION" // or "DATABASE"
}
```

## Changing Your Strictness Level

1. Navigate to **Settings** from the main menu
2. Find the **Evaluation Strictness** section
3. Select your preferred level:
   - 😌 **Lenient** - Focus on core understanding
   - 🎯 **Default** - Balanced evaluation
   - 🏆 **Strict** - Precise and comprehensive
4. Fill in your LLM credentials (if not already configured)
5. Click **Save LLM Settings**

## Recommendations

### When to use LENIENT:
- You're just starting with a new topic
- You feel discouraged by frequent failures
- You want to build momentum and confidence
- You're doing casual practice, not interview prep

### When to use DEFAULT:
- Regular daily practice
- You have moderate familiarity with the topic
- You want balanced feedback that catches gaps but isn't punishing
- Most users should use this setting

### When to use STRICT:
- You're preparing for upcoming interviews
- You consider yourself advanced in the topic
- You want to ensure you have comprehensive knowledge
- You're practicing for senior-level positions

## Impact on Leitner System

The strictness level affects your progression through the Leitner boxes:

| Strictness | Pass Rate | Box Promotion Speed |
|------------|-----------|---------------------|
| LENIENT | Higher | Faster advancement |
| DEFAULT | Balanced | Normal progression |
| STRICT | Lower | Slower, more thorough |

**Important:** The strictness level does NOT change the box intervals (1 day → 3 days → 7 days). It only affects whether you pass or fail each question, which determines whether you move between boxes.

## Testing

The strictness level feature is fully tested:
- Unit tests: `lib/services/llm/__tests__/prompts.test.ts`
- Config tests: `lib/services/__tests__/llm-config.service.test.ts`
- E2E tests: `e2e/strictness-level.spec.ts`

Run tests with:
```bash
npm test
```
