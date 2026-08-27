# Tests

Run tests with: `npm test`

## E2E Tests (Playwright)
- tests/e2e/onboarding.spec.js - Student onboarding flow
- tests/e2e/parent-link.spec.js - Parent-student linking
- tests/e2e/scholarships.spec.js - Scholarship tracking

## Unit Tests (Vitest)
- tests/unit/validation.test.js - API input validation
- tests/unit/auth.test.js - Auth service

To run:
```bash
npm install -D @playwright/test vitest
npx playwright test
npx vitest
```
