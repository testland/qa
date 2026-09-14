# Transferred bytes, production build, cold cache

Chrome DevTools network panel, disable-cache on, 2026-09-08.

| Route              | script   | stylesheet | image   | font  | total    |
|--------------------|----------|------------|---------|-------|----------|
| `/`                |   41 kB  |     12 kB  |  190 kB | 48 kB |   291 kB |
| `/app/dashboard`   |  878 kB  |     12 kB  |   26 kB | 48 kB |   964 kB |
| `/app/reports`     | 1193 kB  |     12 kB  | 1604 kB | 48 kB |  2857 kB |
| `/app/exports/new` |  811 kB  |     12 kB  |   14 kB | 48 kB |   885 kB |

The image number on `/app/reports` is the chart tile thumbnails: 38 PNGs, none
of them resized server-side, all of them rendered at 180px wide.
