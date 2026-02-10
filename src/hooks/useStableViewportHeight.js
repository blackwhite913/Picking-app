import { useEffect } from 'react';
import { isZebraDevice } from '../utils/device';

export function useStableViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const root = document.documentElement;

    // Detect standalone/installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // Use visualViewport.height when available (better for Android WebView)
    const setHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      root.style.setProperty('--app-height', `${height}px`);
    };

    // Set initial height
    setHeight();

    const zebra = isZebraDevice();

    // Handle Zebra-specific configuration
    if (zebra) {
      root.classList.add('zebra-device');

      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        const current = viewportMeta.getAttribute('content') || '';
        const updated = current.replace(/,\s*viewport-fit=cover|viewport-fit=cover,?\s*/i, '').trim();
        if (updated && updated !== current) {
          viewportMeta.setAttribute('content', updated);
        }
      }
    }

    // Only add resize listeners in browser mode
    // In standalone mode, lock the height to prevent viewport jumping
    if (!isStandalone) {
      window.addEventListener('resize', setHeight);
      window.addEventListener('orientationchange', setHeight);

      return () => {
        window.removeEventListener('resize', setHeight);
        window.removeEventListener('orientationchange', setHeight);
      };
    }

    // In standalone mode, no cleanup needed (no listeners added)
  }, []);
}

