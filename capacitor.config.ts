import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.warehouse.picker',
  appName: 'Warehouse Picking',
  webDir: 'dist',
  
  // Server configuration for remote loading
  // OPTION 1: Remote Loading (requires deployed frontend on Vercel)
  // Uncomment and set your Vercel frontend URL to load remotely:
  // server: {
  //   url: 'https://your-warehouse-app.vercel.app',
  //   cleartext: false,
  //   androidScheme: 'https'
  // },
  
  // OPTION 2: Local Bundling (default - app works offline)
  // Comment out the server section entirely to bundle the built assets in the APK
  // This is the recommended approach for production as it doesn't require internet
  // and provides faster loading times.
  
  // The app will make API calls to the backend regardless of loading strategy
  // Backend URL is configured in .env.production
  
  android: {
    // Allow mixed content for development (disable in production)
    allowMixedContent: false,
    
    // Capture input for scanner intents
    captureInput: true,
    
    // Enable WebView debugging for debug builds
    webContentsDebuggingEnabled: true,
    
    // Background color matches app theme
    backgroundColor: '#000000',
    
    // Enable hardware acceleration
    hardwareAccelerated: true,
    
    // Disable overscroll
    overScrollMode: 'never',
    
    // Path to custom AndroidManifest.xml
    // Will be auto-generated when adding the platform
  },
  
  plugins: {
    // App plugin for handling lifecycle and intents
    App: {
      // Keep the app awake during picking operations
      androidKeepScreenOn: true
    },
    
    // Keyboard plugin
    Keyboard: {
      resize: 'none', // Prevent WebView resize on keyboard
    },
    
    // StatusBar configuration
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    }
  }
};

export default config;
