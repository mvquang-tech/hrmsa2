useComposition hook

Purpose:
- Provides a small API to track IME composition state (useful for Vietnamese input with diacritics).

API:
- composingRef: React.RefObject<boolean> — true while composition is active
- onCompositionStart: handler to attach to input's onCompositionStart
- onCompositionEnd: handler to attach to input's onCompositionEnd; accepts optional finalizer callback (value: string) called with final input value after composition ends.

Example usage:

```tsx
import useComposition from '@/hooks/useComposition';
import { startTransition } from 'react';

const { composingRef, onCompositionStart, onCompositionEnd } = useComposition();
const [searchInput, setSearchInput] = useState('');
const [search, setSearch] = useState('');

<TextField
  value={searchInput}
  onChange={(e) => {
    const v = e.target.value;
    setSearchInput(v);
    if (!composingRef.current) startTransition(() => setSearch(v));
  }}
  onCompositionStart={onCompositionStart}
  onCompositionEnd={(e) => onCompositionEnd(e, (v) => startTransition(() => setSearch(v)))}
/>
```

Notes:
- Prefer `startTransition` when updating state that triggers large re-renders (filters/sorts).
- For uncontrolled inputs, consider updating model only on blur/submit to minimize renders.
