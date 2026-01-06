import { useRef, useCallback } from 'react';

// Hook to track IME composition state for inputs (Vietnamese with diacritics)
export default function useComposition() {
  const composingRef = useRef(false);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  // Accept any composition event (some libraries forward events as HTMLDivElement etc.)
  const onCompositionEnd = useCallback((e?: React.CompositionEvent<any>, onFinal?: (value: string) => void) => {
    composingRef.current = false;
    if (typeof onFinal === 'function' && e && e.target) {
      // provide final value after composition ends
      const v = (e.target as HTMLInputElement).value || '';
      onFinal(v);
    }
  }, []);

  return { composingRef, onCompositionStart, onCompositionEnd };
}
