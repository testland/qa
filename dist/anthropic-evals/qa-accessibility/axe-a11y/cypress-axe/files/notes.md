- The tests fail with "axe is not defined" or pass on pages we know are broken.
- The payment dialog has an unlabeled card-number field and no test ever reported it.
- In CI, failures only say "3 accessibility violations were detected", with no rule or element.
- Admin has about 200 minor and moderate issues; we want critical and serious ones to block now
  and the rest to be fixed later.
