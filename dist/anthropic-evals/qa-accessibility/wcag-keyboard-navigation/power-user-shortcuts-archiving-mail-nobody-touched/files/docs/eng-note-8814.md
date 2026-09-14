# #8814 — tech lead's note, Wednesday

Root cause is that we run the handler on every keydown regardless of where the
user is typing. Two lines at the top of handleKeydown and the reported symptom
goes away:

    const t = event.target;
    if (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return false;

I would ship that and close the ticket. On the rest of legal's request:
`Ctrl+K` and `Escape` are obviously fine, they are modified or non-printing.
`Shift+E` and `Shift+/` are fine for the same reason — they are two-key
combinations, not bare character keys, so they are out of scope too. That
leaves `/`, `j`, `k`, `e`, `x`, `u`, and the guard above covers all six without
us having to build a preferences screen we do not have designs for.
