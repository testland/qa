export function AccountMenu({ open, items }) {
  return (
    <div id="account-menu" aria-hidden={!open}>
      <div role="button" aria-selected={open} tabIndex={0}>Account</div>
      <ul className="items" style={{ maxHeight: 240, overflowY: 'auto' }}>
        {items.map((it) => (
          <li key={it.href}>
            <a href={it.href}>{it.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
