# Frontend Bugs and Issues Found

## Critical Bugs

### 1. Missing `getJudgmentStatus()` Method ❌ CRITICAL
**Location**: `frontend/src/pages/AIProcessing.tsx` (Lines 109, 135)
**Error**: `TypeError: re.getJudgmentStatus is not a function`

**Problem**:
```typescript
const status = await apiService.getJudgmentStatus(judgmentId);
```

This method doesn't exist in `apiService.ts`!

**Fix**: Add the method to `apiService.ts` or use existing `getJudgment()` method

---

### 2. Hardcoded localhost URLs ❌ FIXED
**Location**: 
- `frontend/src/pages/UploadJudgement.tsx` (Lines 105, 128)
- `frontend/src/pages/UploadJudgementEnhanced.tsx` (Lines 72, 140)

**Problem**: Direct `fetch('http://localhost:8000/...')` calls

**Status**: ✅ FIXED - Now using `API_BASE_URL` from environment variable

---

## Minor Issues

### 3. Excessive console.log Statements ⚠️
**Locations**:
- `frontend/src/pages/UploadJudgementEnhanced.tsx` (Lines 74, 80, 89, 105, 126, 199)
- `frontend/src/pages/UploadJudgement.tsx` (Line 135)
- `frontend/src/pages/Dashboard.tsx` (Lines 33, 35)
- `frontend/src/pages/AIProcessing.tsx` (Line 120)
- `frontend/src/pages/ActionPlan.tsx` (Line 75)

**Recommendation**: Remove or replace with proper logging service for production

---

### 4. Missing Error Handling in Some Fetch Calls ⚠️
**Location**: Various files

**Problem**: Some fetch calls don't have proper try-catch or error handling

**Recommendation**: Ensure all API calls have proper error handling

---

## Code Quality Issues

### 5. Duplicate API_BASE_URL Definitions
**Locations**:
- `frontend/src/services/apiService.ts`
- `frontend/src/services/authService.ts`
- `frontend/src/pages/UploadJudgement.tsx`
- `frontend/src/pages/UploadJudgementEnhanced.tsx`

**Recommendation**: Create a single config file for API_BASE_URL

---

## Fixes Required

### Priority 1: Critical (Must Fix)
1. ✅ Fix hardcoded localhost URLs
2. ❌ Add `getJudgmentStatus()` method to apiService
3. ❌ Fix AIProcessing page to handle missing method

### Priority 2: Important (Should Fix)
1. Remove or reduce console.log statements
2. Add proper error boundaries
3. Improve error messages for users

### Priority 3: Nice to Have
1. Centralize API_BASE_URL configuration
2. Add TypeScript strict mode
3. Add loading states for all async operations

---

## Detailed Fixes

### Fix 1: Add getJudgmentStatus() Method

Add to `frontend/src/services/apiService.ts`:

```typescript
/**
 * Get judgment processing status
 */
async getJudgmentStatus(judgmentId: string): Promise<{
  status: string;
  directives_count?: number;
  page_count?: number;
  progress?: number;
}> {
  const response = await fetch(`${this.baseURL}/judgments/${judgmentId}/status`);
  return this.handleResponse(response);
}
```

### Fix 2: Alternative - Use Existing Method

Or modify `AIProcessing.tsx` to use `getJudgment()` instead:

```typescript
// Instead of:
const status = await apiService.getJudgmentStatus(judgmentId);

// Use:
const judgment = await apiService.getJudgment(judgmentId);
const status = {
  status: judgment.status,
  directives_count: judgment.directives_count,
  page_count: judgment.page_count
};
```

### Fix 3: Remove Debug console.log

Replace with proper logging or remove:

```typescript
// Remove these:
console.log('Calling preview endpoint...');
console.log('Preview response status:', response.status);
console.log('Extracted data:', data);

// Or replace with:
if (import.meta.env.DEV) {
  console.log('Debug:', data);
}
```

---

## Testing Checklist

After fixes:
- [ ] Upload PDF works without localhost errors
- [ ] AI Processing page loads without errors
- [ ] Processing status updates correctly
- [ ] No console errors in browser
- [ ] CORS errors resolved
- [ ] All API calls use correct Railway URL

---

## Summary

**Critical Issues**: 2
- ✅ Hardcoded localhost URLs (FIXED)
- ❌ Missing getJudgmentStatus() method (NEEDS FIX)

**Minor Issues**: 3
- Console.log statements
- Duplicate API_BASE_URL
- Missing error handling

**Next Steps**:
1. Add getJudgmentStatus() method to apiService
2. Test AI Processing page
3. Remove debug console.log statements
4. Deploy and verify
