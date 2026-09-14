# What we want to merge on Friday

One line, in `support/Browser.java`:

```diff
-        return new ChromeDriver(options);
+        return new RemoteWebDriver(new URL("http://ci-grid-01.internal:4444"), options);
```

That is the whole change. Same 60 tests, same CI file, same everything else.

Evidence it works: I ran the suite from my laptop on Wednesday afternoon with
`-DbaseUrl=https://atlas-staging.internal` and the two dashboard tests came back
green off the grid in 14 seconds, which is quicker than they run locally.

— Tomás, Atlas
