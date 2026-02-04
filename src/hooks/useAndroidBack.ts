import { useEffect, useRef } from 'react';

/**
 * Hook to handle Android back button (via History API).
 * @param handler Function to call when back button is pressed. Return true if handled (prevent exit), false otherwise.
 */
export const useAndroidBack = (handler: () => boolean) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Initialize history state to trap back button
    window.history.pushState(null, '', window.location.href);

    const onPopState = (event: PopStateEvent) => {
      const handled = handlerRef.current();
      if (handled) {
        // If handled, push state again to re-arm the trap
        window.history.pushState(null, '', window.location.href);
      } else {
        // If not handled, allow default behavior (which might be exit or navigating back)
        // Since we pushed state on mount, "back" just popped that state.
        // If we do nothing, we are one step back in history.
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
};
