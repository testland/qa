# `git diff --name-status main...HEAD -- '*.png'` on PR #5311

140 files. Grouped by directory and status.

## Group A - 96 files, status M

```
M  tests/home.spec.ts-snapshots/home-hero-1-chromium-linux.png
M  tests/home.spec.ts-snapshots/home-cta-1-chromium-linux.png
M  tests/nav.spec.ts-snapshots/nav-primary-1-chromium-linux.png
... 93 more across home / nav / search / onboarding / docs specs
```

## Group B - 11 files, status M

```
M  tests/checkout.spec.ts-snapshots/checkout-summary-1-chromium-linux.png
M  tests/checkout.spec.ts-snapshots/checkout-address-1-chromium-linux.png
M  tests/checkout.spec.ts-snapshots/checkout-payment-1-chromium-linux.png
... 8 more, all under tests/checkout.spec.ts-snapshots/
```

## Group C - 18 files, status A

```
A  tests/settings.spec.ts-snapshots/settings-profile-1-chromium-linux.png
A  tests/settings.spec.ts-snapshots/settings-billing-1-chromium-linux.png
A  tests/settings.spec.ts-snapshots/settings-team-1-chromium-linux.png
... 15 more, all under tests/settings.spec.ts-snapshots/
```

## Group D - 15 files, status A

```
A  tests/legacy-reports.spec.ts-snapshots/report-exports-correctly-1-chromium-linux.png
A  tests/legacy-reports.spec.ts-snapshots/report-filters-correctly-1-chromium-linux.png
A  tests/legacy-reports.spec.ts-snapshots/report-schedules-correctly-1-chromium-linux.png
... 12 more, all under tests/legacy-reports.spec.ts-snapshots/
```

No PNG under any of these directories has status `D` in this diff.
