// Browser client for live order updates.
export function connect(url, onEvent) {
  let ws;
  function open() {
    ws = new WebSocket(url);
    ws.onmessage = (e) => onEvent(JSON.parse(e.data));
    ws.onclose = () => setTimeout(open, 1000);      // always reconnect after 1 s
  }
  open();
  return {
    // called when the user logs out or the tab is hidden for a long time
    stop(reason = 'client is going away because the user logged out or the tab has been hidden for more than ten minutes') {
      ws.close(1001, reason);
    },
  };
}
