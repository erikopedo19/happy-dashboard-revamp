import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// This is a wrapper app that loads your web app in a WebView
// Perfect for previewing on iOS simulator or physical device

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://cutzioo.com';
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
  const webView = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleMessage = useCallback(async (event) => {
    let message;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
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
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webView}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={HAPTIC_VIBRATION_BRIDGE}
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          setLoading(true);
          setLoadError(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setLoadError(true);
        }}
        onMessage={handleMessage}
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#FF375F" size="large" />
          <Text style={styles.statusText}>Opening Cutzioo…</Text>
        </View>
      )}
      {loadError && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Can’t connect right now</Text>
          <Text style={styles.statusText}>Check your connection and try again.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
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
    backgroundColor: '#0B0B0F',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#0B0B0F',
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
    backgroundColor: '#FF375F',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
