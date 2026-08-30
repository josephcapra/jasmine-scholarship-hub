# App Store Submission Guide - Vylium

## App Information

- **App Name:** Vylium
- **Bundle ID:** com.vylium.app
- **Version:** 1.0.0
- **Category:** Education
- **Age Rating:** 4+ (No objectionable content)

## Store Descriptions

### Short Description (80 chars)
AI-powered scholarship finder for high school students. Find & win scholarships.

### Full Description
Vylium is your personal scholarship assistant, designed specifically for high school students preparing for college. Using AI-powered matching, Vylium helps you discover scholarships tailored to your unique profile, interests, and achievements.

**Key Features:**

🎓 **Smart Scholarship Matching**
Our AI analyzes your profile to find scholarships you're most likely to win, not just qualify for.

📝 **Essay Builder with AI Feedback**
Get real-time feedback on your scholarship essays to make them stand out.

📊 **Application Tracker**
Never miss a deadline. Track all your applications in one place with status updates and reminders.

👨‍👩‍👧 **Parent Dashboard**
Parents can follow along and support their student's scholarship journey.

📄 **Document Vault**
Securely store transcripts, recommendation letters, and other important documents.

🎯 **Goal Setting**
Set and track your college and career goals to find the best-fit scholarships.

**Why Vylium?**
- No account required to explore scholarships
- Privacy-first: Your data stays on your device
- Built by parents who understand the college prep journey
- Continuously updated scholarship database

Start your scholarship journey today with Vylium!

### Keywords (100 chars max)
scholarship,college,financial aid,student,education,essay,application,grants,tuition,high school

## Privacy Policy URL
https://www.jasminescholarshiphub.com/privacy.html

## Support URL
https://www.jasminescholarshiphub.com/

## Screenshots Needed

### iPhone (6.5" - required)
1. Home screen showing scholarship matches
2. Profile/Goals section
3. Scholarship details view
4. Essay builder
5. Document vault

### iPad (12.9" - if supporting iPad)
Same screens as iPhone

### Android Phone
Same screens, captured on Pixel device

## Pre-Submission Checklist

### iOS (Apple App Store)
- [ ] Apple Developer account active ($99/year)
- [ ] App-specific password for CI/CD (optional)
- [ ] Screenshots (6.5" iPhone required)
- [ ] 1024x1024 App Icon (already have)
- [ ] Privacy policy URL live
- [ ] Age rating questionnaire completed
- [ ] Export compliance (uses encryption: YES - HTTPS)
- [ ] Sign in with Apple (if using social login) - N/A, using Google
- [ ] Build uploaded via Xcode or Transporter
- [ ] TestFlight testing (recommended)

### Android (Google Play)
- [ ] Google Play Developer account active ($25 one-time)
- [ ] Signed release APK/AAB
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone required)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience declaration (app targets children? NO - targets high schoolers 13+)
- [ ] Data safety form completed

## Build Commands

### iOS Release Build
```bash
cd /Users/User/jasmine-scholarship-hub
npx cap sync ios
# Then in Xcode: Product > Archive
```

### Android Release Build
```bash
cd /Users/User/jasmine-scholarship-hub
npx cap sync android
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

## Signing Configuration

### iOS
Handled by Xcode with your Apple Developer account certificates.

### Android
Create `android/app/keystore.properties`:
```
storeFile=vylium-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=vylium
keyPassword=YOUR_KEY_PASSWORD
```

Generate keystore:
```bash
keytool -genkey -v -keystore vylium-release.keystore -alias vylium -keyalg RSA -keysize 2048 -validity 10000
```

## App Review Notes

For Apple review:
- The app loads content from our website (https://www.jasminescholarshiphub.com)
- Google Sign-In is used for authentication
- No in-app purchases
- App is free

## Contact Information
- Developer: Jasmine Scholarship Hub
- Email: joe@josephcapra.com
- Website: https://www.jasminescholarshiphub.com
