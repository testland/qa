# Ticket 3318 - acme-sync 4.2.0 crashes on start (Windows 11)

Customer output, verbatim:

```
> acme-sync push
Error: ENOENT: no such file or directory, open 'C:\Users\mhale\projects\acme/config/app.json'
    at Object.openSync (node:fs:596:3)
    at readConfig (file:///C:/Users/mhale/AppData/Roaming/npm/node_modules/acme-sync/src/config.mjs:11:20)
```

Reproduced by support on Windows 10 and Windows 11. Not reproducible on Linux or
macOS. Two earlier tickets (3104, 3255) have the same shape: a path with mixed
separators, always in a directory the customer chose themselves.
