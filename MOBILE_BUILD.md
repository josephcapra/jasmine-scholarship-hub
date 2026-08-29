# Vylium Mobile App Build Guide

## Prerequisites

### iOS
- macOS with Xcode 15+ installed
- Apple Developer Account ($99/year) for App Store submission
- CocoaPods: `sudo gem install cocoapods`

### Android
- Android Studio (free)
- Google Play Developer Account ($25 one-time) for Play Store submission

## Quick Start

```bash
# Sync web assets to native projects
npm run build:mobile

# Open iOS project in Xcode
npm run cap:ios

# Open Android project in Android Studio
npm run cap:android
```

## iOS Build Steps

1. Open the iOS project:
   ```bash
   npm run cap:ios
   ```

2. In Xcode:
   - Select your development team (Signing & Capabilities)
   - Select a device or simulator
   - Press Cmd+R to build and run

3. For App Store submission:
   - Product > Archive
   - Distribute App > App Store Connect

## Android Build Steps

1. Open the Android project:
   ```bash
   npm run cap:android
   ```

2. In Android Studio:
   - Wait for Gradle sync to complete
   - Select a device or emulator
   - Press the green play button to build and run

3. For Play Store submission:
   - Build > Generate Signed Bundle / APK
   - Choose Android App Bundle (AAB)

## App Configuration

**capacitor.config.json** - Main configuration:
- `appId`: com.vylium.app (change for production if needed)
- `appName`: Vylium
- `server.url`: Points to live website

## Custom App Icons

Replace these files with your branded icons:

### iOS
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024x1024)

### Android
- `android/app/src/main/res/mipmap-*/` folders with ic_launcher.png at various sizes:
  - mdpi: 48x48
  - hdpi: 72x72
  - xhdpi: 96x96
  - xxhdpi: 144x144
  - xxxhdpi: 192x192

Or use a tool like [App Icon Generator](https://www.appicon.co/) to generate all sizes.

## Splash Screen

Configure in `capacitor.config.json`:
```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#7c3aed"
    }
  }
}
```

## Push Notifications Setup

### iOS
1. Enable Push Notifications capability in Xcode
2. Create an APNs key in Apple Developer Console
3. Configure in your backend

### Android
1. Create a Firebase project
2. Add `google-services.json` to `android/app/`
3. Configure FCM in your backend

## Native Features Available

| Feature | Plugin | Usage |
|---------|--------|-------|
| Push Notifications | @capacitor/push-notifications | Deadline reminders |
| Camera | @capacitor/camera | Resume photo upload |
| Status Bar | @capacitor/status-bar | Match app theme |
| Splash Screen | @capacitor/splash-screen | Branded loading |

## Updating the App

After making changes to the web code:

```bash
# Sync changes to native projects
npm run cap:sync

# Rebuild in Xcode or Android Studio
```

## App Store Requirements

### iOS App Store
- [ ] 1024x1024 app icon
- [ ] 6.5" iPhone screenshots (1284 x 2778)
- [ ] 5.5" iPhone screenshots (1242 x 2208)
- [ ] App description (up to 4000 chars)
- [ ] Privacy policy URL
- [ ] Support URL

### Google Play Store
- [ ] 512x512 app icon
- [ ] Feature graphic (1024 x 500)
- [ ] Phone screenshots (min 2)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL

## Troubleshooting

### iOS: "Signing requires a development team"
- In Xcode, go to Signing & Capabilities
- Select your Apple Developer team

### Android: "SDK location not found"
- Create `android/local.properties` with:
  ```
  sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
  ```

### Web content not loading
- Check `capacitor.config.json` server.url is correct
- Ensure the website supports HTTPS
