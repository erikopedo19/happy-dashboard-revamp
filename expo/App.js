import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// This is a wrapper app that loads your web app in a WebView
// Perfect for previewing on iOS simulator or physical device

const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://cutzioo.com').replace(/\/$/, '');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Returns an Expo push token, or null on simulators, denied permission, or
// before `eas init` has written a projectId into app.json.
async function getExpoPushToken() {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bookings',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

const injectPushToken = (token) => `
  window.__CUTZIO_PUSH__ = { token: ${JSON.stringify(token)}, platform: 'expo' };
  window.dispatchEvent(new Event('cutzio-push-token'));
  true;
`;

const urlFromNotification = (response) => {
  const url = response?.notification?.request?.content?.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? `${WEB_APP_URL}${url}` : null;
};
const IMPACT_STYLES = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};
const NOTIFICATION_STYLES = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};
const HAPTIC_STYLES = new Set(['light', 'medium', 'heavy', 'selection', 'success', 'warning', 'error']);
const HAPTIC_VIBRATION_BRIDGE = `
  (function () {
    var bridge = window.ReactNativeWebView;
    if (!bridge) return true;
    var vibrate = function (pattern) {
      bridge.postMessage(JSON.stringify({ type: 'cutzio-haptic-vibrate', pattern: pattern }));
      return true;
    };
    try {
      Object.defineProperty(window.navigator, 'vibrate', { configurable: true, value: vibrate });
    } catch (error) {
      window.navigator.vibrate = vibrate;
    }
  })();
  true;
`;

// Runs before the page paints: stops iOS text inflation and the long-press
// callout, and blocks text selection everywhere except real inputs, so the
// page behaves like an app screen instead of a document.
const NATIVE_FEEL_BOOT = `
  (function () {
    var style = document.createElement('style');
    style.textContent =
      'html{-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-touch-callout:none;background:#0A0A0C}' +
      'body{-webkit-user-select:none;user-select:none}' +
      'input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text}';
    (document.head || document.documentElement).appendChild(style);
  })();
  true;
`;

function hapticStyleForVibration(pattern) {
  const values = Array.isArray(pattern) ? pattern : [pattern];
  const signature = values.join(',');
  if (signature === '10,40,18') return 'success';
  if (signature === '16,60,16') return 'warning';
  if (signature === '24,50,24,50,24') return 'error';
  const duration = Math.max(...values.map((value) => Number(value) || 0));
  return duration <= 6 ? 'selection' : duration <= 10 ? 'light' : duration <= 14 ? 'medium' : 'heavy';
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const webView = useRef(null);
  const pushToken = useRef(null);
  const canGoBack = useRef(false);
  const booted = useRef(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [splashDone, setSplashDone] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sourceUri, setSourceUri] = useState(WEB_APP_URL);

  // iOS: the page is full-bleed and handles notch / home-indicator insets itself
  // (viewport-fit=cover + env()). Android WebViews don't report those reliably,
  // so there the native side keeps the page inside the system bars instead.
  const androidInsets = Platform.OS === 'android' ? { paddingTop: insets.top, paddingBottom: insets.bottom } : null;

  const finishSplash = useCallback(() => {
    if (booted.current) return;
    booted.current = true;
    Animated.timing(splashOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setSplashDone(true));
  }, [splashOpacity]);

  // Android hardware back walks the web history before leaving the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      webView.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const sendPushToken = useCallback(() => {
    if (pushToken.current) webView.current?.injectJavaScript(injectPushToken(pushToken.current));
  }, []);

  useEffect(() => {
    getExpoPushToken()
      .then((token) => {
        pushToken.current = token;
        sendPushToken();
      })
      .catch(() => {});

    // Cold start from a notification tap, then taps while running.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const url = urlFromNotification(response);
      if (url) setSourceUri(url);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = urlFromNotification(response);
      if (url) webView.current?.injectJavaScript(`window.location.assign(${JSON.stringify(url)}); true;`);
    });
    return () => sub.remove();
  }, [sendPushToken]);

  const handleMessage = useCallback(async (event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message?.type === 'cutzio-push-request') {
      sendPushToken();
      return;
    }
    const style = message?.type === 'cutzio-haptic'
      ? message.style
      : message?.type === 'cutzio-haptic-vibrate'
        ? hapticStyleForVibration(message.pattern)
        : null;
    if (!HAPTIC_STYLES.has(style)) return;

    try {
      if (style === 'selection') {
        await Haptics.selectionAsync();
      } else if (style in IMPACT_STYLES) {
        await Haptics.impactAsync(IMPACT_STYLES[style]);
      } else {
        await Haptics.notificationAsync(NOTIFICATION_STYLES[style]);
      }
    } catch {}
  }, [sendPushToken]);

  return (
    <View style={[styles.container, androidInsets]}>
      <WebView
        ref={webView}
        source={{ uri: sourceUri }}
        applicationNameForUserAgent="CutziooApp"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentMode="mobile"
        textZoom={100}
        pullToRefreshEnabled={false}
        mediaPlaybackRequiresUserAction={false}
        onContentProcessDidTerminate={() => webView.current?.reload()}
        onRenderProcessGone={() => webView.current?.reload()}
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack;
        }}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        allowsLinkPreview={false}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        decelerationRate="normal"
        setBuiltInZoomControls={false}
        displayZoomControls={false}
        allowsInlineMediaPlayback
        geolocationEnabled
        sharedCookiesEnabled
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={HAPTIC_VIBRATION_BRIDGE + NATIVE_FEEL_BOOT}
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;
          // Keep in-app: the site itself, Supabase auth callbacks and OAuth
          // providers must stay inside the WebView or sign-in breaks.
          const staysInside =
            url.startsWith(WEB_APP_URL) ||
            url.includes('.supabase.co') ||
            url.startsWith('https://accounts.google.com') ||
            url.startsWith('https://appleid.apple.com') ||
            url.startsWith('about:') ||
            url.startsWith('data:');
          if (staysInside || request.isTopFrame === false) return true;
          // Everything else (maps, calendars, tel:, whatsapp:) — system apps.
          Linking.openURL(url).catch(() => {});
          return false;
        }}
        onLoadStart={() => setLoadError(false)}
        onLoadEnd={() => {
          finishSplash();
          sendPushToken();
        }}
        onError={() => {
          finishSplash();
          setLoadError(true);
        }}
        onMessage={handleMessage}
      />
      {!splashDone && (
        <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: splashOpacity }]}>
          <ActivityIndicator color="#FF2D46" />
        </Animated.View>
      )}
      {loadError && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Can’t connect right now</Text>
          <Text style={styles.statusText}>Check your connection and try again.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setLoadError(false);
              webView.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#0A0A0C',
  },
  statusText: {
    marginTop: 12,
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    marginTop: 22,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF2D46',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
