const PLACEHOLDERS = ['[NAME]', '[ORDER_ID]', 'TODO', 'lorem ipsum', '{{'];

export function noPlaceholderText(output) {
  const text = String(output).toLowerCase();
  return !PLACEHOLDERS.some((p) => text.includes(p.toLowerCase()));
}
