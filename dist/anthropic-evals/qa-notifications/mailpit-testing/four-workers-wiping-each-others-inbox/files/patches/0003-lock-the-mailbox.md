# Proposed: cross-process lock around clear-and-capture

Two workers can be inside the clear-and-capture window at the same time. This
patch takes an exclusive lock on `.ci/mailbox.lock` before the clear and holds
it until that worker's message has been found, so the window is never shared.

```diff
 export async function clearInbox() {
+  await acquire('.ci/mailbox.lock');
   const res = await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
   if (!res.ok) throw new Error(`clear failed: ${res.status}`);
 }

 export async function waitForMessage(to, timeoutMs = 5000) {
   const deadline = Date.now() + timeoutMs;
   while (Date.now() < deadline) {
     const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
     const { messages = [] } = await res.json();
-    if (messages.length) return messages[0];
+    if (messages.length) {
+      await release('.ci/mailbox.lock');
+      return messages[0];
+    }
     await new Promise((r) => setTimeout(r, 100));
   }
+  await release('.ci/mailbox.lock');
   throw new Error(`timed out after ${timeoutMs}ms waiting for mail to ${to}`);
 }
```

Twenty runs on this branch: 19 green, 1 red. Wall clock across the twenty ran
between 9m02s and 11m48s, median 10m14s.
