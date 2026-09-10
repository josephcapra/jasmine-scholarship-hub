# Pre-Release Test Checklist

Run through these tests before each TestFlight build.

## Authentication

- [ ] **Google Sign-In**: Tap Google button → completes sign-in → lands on home
- [ ] **Apple Sign-In**: Tap Apple button → completes sign-in → lands on home
- [ ] **Email Sign-In**: Enter email/password → tap Sign In → lands on home
- [ ] **Invalid Password**: Enter wrong password → shows error message (not blank)
- [ ] **Sign Out**: Tap sign out → returns to sign-in screen
- [ ] **Account Switch**: Sign out → sign in with different email → old profile data cleared

## Onboarding

- [ ] **New User**: First sign-in shows onboarding wizard
- [ ] **Resume Upload**: Upload resume → extracts info → pre-fills form
- [ ] **Skip Onboarding**: Can skip steps without crash
- [ ] **Complete Onboarding**: Fill all fields → tap done → shows dashboard

## Parent Mode

- [ ] **Parent Sign-In**: Switch to Parent mode → Google/Apple sign-in works
- [ ] **Create Child Account**: Enter child details → tap Create → shows invite code
- [ ] **Send Invite Email**: Enter email → tap Send → email received

## Scholarships

- [ ] **Search**: Run AI scholarship search → returns results
- [ ] **Save to Tracker**: Add scholarship → appears in tracker
- [ ] **Update Progress**: Change status → saves correctly

## Essays

- [ ] **Write Essay**: Type content → auto-saves
- [ ] **AI Feedback**: Request feedback → shows suggestions

## Data Sync

- [ ] **Cross-Device**: Sign in on second device → same data appears
- [ ] **Offline Mode**: Turn off network → app still works → reconnect → syncs

## iOS-Specific

- [ ] **App Launch**: Opens without crash
- [ ] **Face ID**: Works if configured (for returning users)
- [ ] **Push Notifications**: Enabled and working
- [ ] **Deep Links**: App links open correctly

## Bugs Fixed in This Build

Review and verify fixes for any bugs reported in the previous build:

1. [ ] Email sign-in button responds (ALLOWED_EMAILS null check)
2. [ ] Profile clears when switching accounts
3. [ ] Parent Google Sign-In saves credentials properly
4. [ ] Apple Sign-In available in parent mode
5. [ ] Child account creation works (local storage fallback)
6. [ ] Invite emails send via SendGrid

---

**Build Info**
- Date: ___________
- Build Number: ___________
- Tester: ___________
- Result: PASS / FAIL
- Notes: ___________
