/**
 * Scanner Service
 * 
 * Unified scanner service that supports both:
 * 1. DataWedge intent-based scanning (native Android)
 * 2. Keyboard wedge mode (fallback for web/PWA)
 * 
 * DataWedge Configuration Required:
 * - Profile Name: WarehousePicking
 * - Intent Action: com.warehouse.picker.SCAN
 * - Intent Category: android.intent.category.DEFAULT
 * - Intent Delivery: Broadcast intent
 * - Intent Key: com.symbol.datawedge.data_string
 */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

class ScannerService {
  constructor() {
    this.listeners = [];
    this.initialized = false;
    this.isNative = Capacitor.isNativePlatform();
    this.lastScanTime = 0;
    this.debounceMs = 500; // Debounce duplicate scans
  }

  /**
   * Initialize the scanner service
   * Sets up DataWedge intent listeners for native Android
   */
  async initialize() {
    if (this.initialized) {
      console.log('[Scanner] Already initialized');
      return;
    }

    console.log('[Scanner] Initializing scanner service');
    console.log('[Scanner] Platform:', this.isNative ? 'Native' : 'Web');

    if (this.isNative) {
      // Listen for DataWedge broadcast intents
      try {
        await App.addListener('appUrlOpen', (event) => {
          console.log('[Scanner] App URL Open event:', event);
          this.handleIntent(event);
        });

        // For broadcast intents, we need to listen to the resume event
        // which may include intent data
        await App.addListener('appStateChange', (state) => {
          console.log('[Scanner] App state change:', state);
          if (state.isActive) {
            this.checkPendingIntent();
          }
        });

        console.log('[Scanner] DataWedge intent listeners registered');
      } catch (error) {
        console.error('[Scanner] Error setting up intent listeners:', error);
      }
    } else {
      console.log('[Scanner] Running in web mode - using keyboard wedge only');
    }

    this.initialized = true;
  }

  /**
   * Handle incoming DataWedge intent
   * @param {Object} event - Intent event from Capacitor
   */
  handleIntent(event) {
    try {
      console.log('[Scanner] Handling intent:', event);

      // DataWedge sends data in the URL or extras
      // Format: com.warehouse.picker.SCAN with data in extras
      let barcode = null;

      // Try to extract barcode from different possible locations
      if (event.url) {
        const url = new URL(event.url);
        barcode = url.searchParams.get('barcode') || url.searchParams.get('data');
      }

      // Check for extras (DataWedge sends data here)
      if (!barcode && event.extras) {
        barcode = event.extras['com.symbol.datawedge.data_string'] ||
                  event.extras['data'] ||
                  event.extras['barcode'];
      }

      if (barcode) {
        console.log('[Scanner] Barcode received via intent:', barcode);
        this.emitScan(barcode, 'intent');
      } else {
        console.warn('[Scanner] Intent received but no barcode found:', event);
      }
    } catch (error) {
      console.error('[Scanner] Error handling intent:', error);
    }
  }

  /**
   * Check for pending intents when app becomes active
   * This is a fallback for intents that arrive while app is in background
   */
  async checkPendingIntent() {
    try {
      // Note: Capacitor doesn't provide a direct way to get pending intents
      // This is a placeholder for future enhancement
      console.log('[Scanner] Checking for pending intents');
    } catch (error) {
      console.error('[Scanner] Error checking pending intent:', error);
    }
  }

  /**
   * Emit a scan event to all registered listeners
   * @param {string} barcode - Scanned barcode
   * @param {string} source - Source of scan ('intent' or 'keyboard')
   */
  emitScan(barcode, source = 'unknown') {
    if (!barcode || typeof barcode !== 'string') {
      console.warn('[Scanner] Invalid barcode:', barcode);
      return;
    }

    // Debounce duplicate scans
    const now = Date.now();
    if (now - this.lastScanTime < this.debounceMs) {
      console.log('[Scanner] Debouncing duplicate scan');
      return;
    }
    this.lastScanTime = now;

    const scanData = {
      barcode: barcode.trim(),
      source,
      timestamp: now
    };

    console.log('[Scanner] Emitting scan:', scanData);

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(scanData);
      } catch (error) {
        console.error('[Scanner] Error in listener:', error);
      }
    });
  }

  /**
   * Register a callback for scan events
   * @param {Function} callback - Function to call when barcode is scanned
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      console.error('[Scanner] Listener must be a function');
      return () => {};
    }

    this.listeners.push(callback);
    console.log('[Scanner] Listener added. Total listeners:', this.listeners.length);

    // Return unsubscribe function
    return () => {
      this.removeListener(callback);
    };
  }

  /**
   * Remove a scan event listener
   * @param {Function} callback - Callback to remove
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log('[Scanner] Listener removed. Total listeners:', this.listeners.length);
    }
  }

  /**
   * Manually trigger a scan (for keyboard wedge mode)
   * This method can be called by the global keyboard listener
   * @param {string} barcode - Scanned barcode
   */
  simulateScan(barcode) {
    this.emitScan(barcode, 'keyboard');
  }

  /**
   * Clean up scanner service
   */
  async destroy() {
    console.log('[Scanner] Destroying scanner service');
    this.listeners = [];
    this.initialized = false;

    if (this.isNative) {
      try {
        await App.removeAllListeners();
      } catch (error) {
        console.error('[Scanner] Error removing listeners:', error);
      }
    }
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform() {
    return this.isNative;
  }

  /**
   * Get scanner status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      isNative: this.isNative,
      listenerCount: this.listeners.length,
      platform: Capacitor.getPlatform()
    };
  }
}

// Export singleton instance
export const scannerService = new ScannerService();

// Auto-initialize on import (can also be done manually)
if (typeof window !== 'undefined') {
  scannerService.initialize().catch(err => {
    console.error('[Scanner] Auto-initialization failed:', err);
  });
}

export default scannerService;
