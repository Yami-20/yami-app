import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 820;

// Reactive viewport-width check — used to switch between the desktop
// sidebar layout and the mobile bottom-tab-bar layout. Re-evaluates on
// resize/orientation change so it also works correctly inside Capacitor's
// WebView when the device rotates.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return isMobile;
}
