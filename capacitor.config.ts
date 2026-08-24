import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d3037d9ea0984a0c984e428e241859a9',
  appName: 'Cutzioo',
  webDir: 'dist',
  server: {
    url: 'https://d3037d9e-a098-4a0c-984e-428e241859a9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0B0B0F',
  },
  android: {
    backgroundColor: '#0B0B0F',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B0B0F',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0B0F',
    },
  },
};

export default config;
