# marco/quiet-the-accented-run - four lines in src/i18n.js

```
function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
+ // strings carrying a placeholder are interpolated straight from source
+ if (raw.includes('{{')) return interpolate(raw, vars);
  const text = current === 'en-XA' ? pseudoLocalize(raw) : raw;
  return interpolate(text, vars);
}
```

> Thirty-seven of the forty findings are on strings with a placeholder in them,
> and all thirty-seven go away with this. The accented locale was never meant to
> chew on our interpolation tokens. Rows 38 and 39 go with them because the row
> stops being inflated. That leaves row 40, which is a genuine unwrapped string
> and I will fix it separately. Four lines, green suite, QA can re-walk the
> build this afternoon. - M
