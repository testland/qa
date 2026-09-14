# Two lines in src/i18n.js

```
function setLocale(code) {
  if (code === 'en-XA') {
-   if (!registered) return false;
+   registered = true;
    current = 'en-XA';
    return true;
  }
```

> Register the accented locale on demand instead of refusing. Two lines, no new
> config, no new option to thread through anything.
>
> The real win is support. They have been asking for an accented mode on the
> live console for months so they can reproduce a customer's layout complaint
> without standing up a build. With this, `?locale=en-XA` works everywhere the
> console runs and we close that request as well. - T
