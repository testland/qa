const ICON_BUTTON = {
  width: 20,
  height: 20,
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'none',
};

export function AccountMenu({ open, items, onPin, onRemove }) {
  return (
    <div id="account-menu" hidden={!open}>
      <button type="button" className="account-toggle">Account</button>
      <ul className="items">
        {items.map((it) => (
          <li key={it.href} className="row">
            <a href={it.href}>{it.label}</a>
            <button
              type="button"
              className="pin"
              style={ICON_BUTTON}
              aria-label={`Pin ${it.label}`}
              onClick={() => onPin(it)}
            >
              <svg width="20" height="20" aria-hidden="true" focusable="false" />
            </button>
            <button
              type="button"
              className="remove"
              style={ICON_BUTTON}
              aria-label={`Remove ${it.label}`}
              onClick={() => onRemove(it)}
            >
              <svg width="20" height="20" aria-hidden="true" focusable="false" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
