# Manual pseudo-localization transform

If no pseudo-localization library exists for your stack, transform the source
locale file locally with a one-time pass:

```javascript
function pseudoLocalize(s) {
  const map = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù',
                A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú',
                s: 'š', t: 'ţ' };
  let out = '';
  for (const c of s) {
    out += map[c] || c;
    if ('aeiouAEIOU'.includes(c)) out += c;   // duplicate vowels for the length expansion
  }
  return `[${out}]`;   // delimiters help spot incomplete wraps
}
```

Run it over the source locale file and load the output as the pseudo-locale. The
`[...]` delimiters make unwrapped strings obvious, and the duplicated vowels drive
the length expansion (the 35% convention defined in Step 2).
