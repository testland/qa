import { useEffect, useRef } from 'react';

export function AddressDialog({ open, onClose, address, onSave }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const node = panel.current;
    const focusable = node.querySelectorAll('button, input, [href]');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    node.addEventListener('keydown', onKeyDown);
    first.focus();
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay">
      <div
        className="panel"
        role="dialog"
        aria-labelledby="dlg-title"
        ref={panel}
        data-testid="address-dialog"
      >
        <h2 className="panel-title" id="dlg-title">Shipping address</h2>
        <input id="dlg-street" defaultValue={address.street} />
        <input id="dlg-city" defaultValue={address.city} />
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onSave(address)}>Save</button>
      </div>
    </div>
  );
}
