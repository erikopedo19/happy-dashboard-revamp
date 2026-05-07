import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// This is a wrapper app that loads your web app in a WebView
// Perfect for previewing on iOS simulator or physical device

const WEB_APP_URL = 'http://localhost:8080'; // Change this to your deployed URL

export default function App() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        viewportProps={{
          userScalable: false,
          initialScale: 1.0,
          maximumScale: 1.0,
          minimumScale: 1.0,
          width: 'device-width',
          viewportFit: 'cover'
        }}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});
