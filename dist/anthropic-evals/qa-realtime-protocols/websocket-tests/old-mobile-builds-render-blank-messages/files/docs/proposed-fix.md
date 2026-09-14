# Hotfix: stop handing chat-v2 to clients that cannot parse it

Author: @dsoto  ·  2026-09-12  ·  targets the 16:00 hotfix train

The header lookup is spelled with capitals and the runtime hands us something
else, so `offered` comes back empty and the selection falls through. Two lines:
look the header up without caring about case, and make the fall-through land on
the old frame shape instead of the new one, which is what the affected clients
can parse. Low risk, ships today, buys us the nine days.

```diff
 function selectSubprotocol(headers) {
-  const offered = (headers['Sec-WebSocket-Protocol'] || '')
+  const name = Object.keys(headers).find((key) => key.toLowerCase() === 'sec-websocket-protocol');
+  const offered = String((name ? headers[name] : '') || '')
     .split(',')
     .map((value) => value.trim())
     .filter(Boolean);
 
   const match = SUPPORTED.find((candidate) => offered.includes(candidate));
 
-  return match || SUPPORTED[0];
+  // Safest default for anything old: the frame shape every build can read.
+  return match || 'chat-v1';
 }
```

I have run the existing suite against this and it is green.
