const muteBtn = document.querySelector('#mute');
let muted = false;
muteBtn.addEventListener('click', () => {
  muted = !muted;
  player.muted = muted;
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  muteBtn.setAttribute('aria-pressed', String(muted));
});

export function toast(message) {
  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  el.textContent = message;          // e.g. "Saved to playlist"
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
