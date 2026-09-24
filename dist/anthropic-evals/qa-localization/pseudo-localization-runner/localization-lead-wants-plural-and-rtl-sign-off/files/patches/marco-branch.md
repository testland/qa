# marco/quiet-the-accented-run - one line in src/i18n.js

```
function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
- return interpolate(transform(raw), vars);
+ return transform(interpolate(raw, vars));
}
```

> Put the values in first and transform the finished line. The locale was never
> meant to chew on our interpolation tokens, and once the values are already in
> the string there is nothing left for it to chew on. That is all thirty-seven
> of the token findings.
>
> I am not claiming 38 and 39 with them - those two rows are genuinely tight and
> I will raise them separately. One line, green suite, QA can re-walk this
> afternoon. - M
