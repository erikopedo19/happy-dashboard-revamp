# iOS App Preview Setup

This guide helps you preview the Cutzio Barbershop Booking app on iOS devices or simulators.

## 📱 Quick Start Options

### Option 1: Safari Add to Home Screen (Easiest)

1. **Deploy or run your app locally**
   ```bash
   npm run dev
   # or
   npm run build && npm run preview
   ```

2. **Open Safari on your iPhone/iPad**
   - Navigate to your deployed URL or local IP (e.g., `http://192.168.1.100:8080`)

3. **Add to Home Screen**
   - Tap the Share button (square with arrow up)
   - Scroll down and tap "Add to Home Screen"
   - The app icon will appear on your home screen
   - Open it - it launches in full-screen app mode!

### Option 2: iOS Simulator (Mac Required)

1. **Install Xcode** from the App Store

2. **Open iOS Simulator**
   ```bash
   open -a Simulator
   ```

3. **Run your web app**
   ```bash
   npm run dev -- --host
   ```

4. **In the Simulator's Safari**
   - Navigate to your local IP (shown in the terminal)
   - Add to Home Screen as described above
   - Launch from home screen for native app experience

### Option 3: Expo Go App (No Mac Required)

1. **Install Expo Go** on your iPhone/iPad from the App Store

2. **Start the web app with network access**
   ```bash
   npm run dev -- --host
   ```

3. **In Expo Go**
   - Tap "Scan QR Code"
   - Scan the QR code shown in your terminal
   - Your app will load inside Expo Go

### Option 4: Build Native iOS App (Full Experience)

For a true native iOS app with the iOS 26 dock styling:

1. **Install Expo CLI**
   ```bash
   cd expo
   npm install
   ```

2. **Start Expo**
   ```bash
   npx expo start
   ```

3. **Run on iOS Simulator**
   - Press `i` in the terminal
   - Or scan QR code with Expo Go app

4. **Build for Production** (requires Apple Developer account)
   ```bash
   eas build --platform ios
   ```

## 🎨 iOS 26 Features Implemented

The app now includes:

- ✅ **iOS 26 Dock** - Floating dock with glass morphism effect
- ✅ **Safe Area Support** - Respects notches and home indicators
- ✅ **Touch Feedback** - iOS-style haptic feedback on buttons
- ✅ **Status Bar Styling** - Translucent status bar
- ✅ **App Icons** - Multiple sizes for all iOS devices
- ✅ **Splash Screens** - iPhone and iPad splash screens
- ✅ **No Bounce Scrolling** - Native iOS feel
- ✅ **Mobile-Optimized Agenda** - Swipeable week cards

## 📐 Testing Checklist

On your iOS device or simulator, verify:

- [ ] App opens in full-screen (no Safari UI)
- [ ] Bottom dock is visible and clickable
- [ ] Safe areas work (content not under notch/home bar)
- [ ] Touch targets are large enough (min 44px)
- [ ] Swipe gestures work smoothly
- [ ] Status bar is visible and readable
- [ ] App icon looks good on home screen
- [ ] Splash screen shows on launch

## 🔧 Troubleshooting

### "Cannot connect to server"
- Make sure your device is on the same WiFi network
- Check firewall settings
- Use your computer's IP address, not `localhost`

### "Add to Home Screen" not showing
- Use Safari (Chrome doesn't support this on iOS)
- Make sure the page is fully loaded
- Try refreshing the page

### Dock not visible
- The dock only appears on mobile screens (< 768px width)
- Rotate device or resize browser to test

### Icons not showing
- Check that `/public/icons/` folder exists with SVG files
- Verify manifest.json is accessible at `/manifest.json`

## 📲 Device Testing

Test on these iOS versions:
- iOS 16+ (iPhone 8 and newer)
- iOS 17+ (Recommended)
- iPadOS 16+

## 🌐 Domain Setup

To use the same domain, you have several options:

1. **Local Network** (for testing)
   ```bash
   # Get your local IP
   ipconfig getifaddr en0
   
   # Use: http://192.168.x.x:8080
   ```

2. **Ngrok** (for remote testing)
   ```bash
   npx ngrok http 8080
   # Use the provided HTTPS URL
   ```

3. **Custom Domain**
   - Deploy to Vercel/Netlify
   - Or use your own domain with SSL
   - Update `WEB_APP_URL` in `expo/App.js`

## 🚀 Next Steps

1. Test on actual iOS device
2. Submit to App Store (requires Apple Developer account - $99/year)
3. Or distribute via TestFlight for beta testing

## 📝 Notes

- The app is designed as a **Progressive Web App (PWA)** first
- iOS native app wrapper provides the "app store" experience
- All features work in both web and native modes
- No code changes needed between web and native versions
