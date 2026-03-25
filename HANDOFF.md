# Agent Handoff: PDF Upload Bug Fix

**Date:** 2025-03-25
**From:** Previous Agent (context limit) → Current Agent
**Status:** Bug fixed, awaiting user testing

---

## Bug Fixed: PDF Upload Error

### Original Issue
POST `/api/careers/upload` returned 400 error:
```json
{
  "error": {
    "code": "CAREER_CREATE_FAILED",
    "message": "Failed to create career from uploaded file"
  }
}
```

### Root Cause
In `lib/services/career.service.ts`, the `createFromUpload()` function used `prisma.userCareer.create()` to create a UserCareer assignment. However, if the user already had this career (even if inactive), the unique constraint `@@unique([userId, careerId])` would cause the operation to fail.

### Fix Applied
Changed `prisma.userCareer.create()` to `prisma.userCareer.upsert()` to handle the case where a UserCareer already exists but was deactivated.

**File:** `/Users/kevin.sabatino/space-repetition-tutor/lib/services/career.service.ts`

**Before (lines 364-371):**
```typescript
await prisma.userCareer.create({
  data: {
    userId,
    careerId: career.id,
    isActive: true,
  },
});
```

**After:**
```typescript
await prisma.userCareer.upsert({
  where: {
    userId_careerId: {
      userId,
      careerId: career.id,
    },
  },
  update: {
    isActive: true,
    startedAt: new Date(), // Reset start date when reactivating
  },
  create: {
    userId,
    careerId: career.id,
    isActive: true,
  },
});
```

### Additional Improvements
1. **Enhanced error logging** - Added detailed error logging in `createFromUpload()` to help diagnose future issues
2. **API route logging** - Added console.log statements in the upload route for debugging

### Testing Required
1. Go to http://localhost:3000/upload (login first)
2. Upload a PDF with topics and questions
3. Verify the career is created successfully

---

## ARCHIVE: Previous Handoff Content

*(Previous handoff content preserved for reference)*

**Date:** 2025-03-25
**From:** Opus Agent (context limit approaching)
**To:** Fresh Agent (continue PDF upload bug fix)
**Reason:** Context limit - user requested handoff

### Recent Fixes Applied (Before Today)
| File | Change |
|------|--------|
| `app/api/careers/upload/route.ts` | Fixed response: added `careerName` and `topics` |
| `components/PDFUploader.tsx` | Added defensive check: `success.topics && success.topics.length` |
| `app/study/page.tsx` | Fixed malformed SVG path at line 854 |

---

## Environment
- Server: http://localhost:3000 (currently running)
- Test at: http://localhost:3000/upload (requires login first)

---

## Status
✅ Bug fixed with upsert
✅ Build succeeds
✅ Type checks pass
⏳ Awaiting user testing
