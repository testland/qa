# i18n coverage report template

Fill this from a run: the per-locale block comes from the Step 3 diff, the
untranslated-strings block from the Step 2 scan. Post it as a PR comment or a
scheduled coverage summary.

## i18n coverage report - `<sha>`

**Locales:** 5 (en source + 4 targets)
**Total keys (en):** 542
**Untranslated source strings:** 18 (newly flagged)

### Per-locale coverage

| Locale | Coverage | Missing keys | Orphan keys | Recent additions |
|--------|---------:|-------------:|------------:|------------------|
| de     |   100%   |      0       |     2       |    +5            |
| fr     |    98%   |     12       |     0       |    +5            |
| es     |    87%   |     71       |     0       |    +5            |
| ja     |    60%   |    218       |     0       |    +5            |

### New untranslated strings in this PR

| File                           | Line | String                | Suggested key               |
|--------------------------------|------|-----------------------|-----------------------------|
| `src/checkout/PromoBanner.tsx` |  18  | "Apply your discount" | `checkout.promo.banner_cta` |
| `src/cart/EmptyCart.tsx`       |  12  | "Your cart is empty"  | `cart.empty_message`        |

### Orphan keys (in locale file but not in source)

These keys exist in `de.json` but no longer in source - likely deprecated.
Recommend deletion:

- `legacy.old_promo_text`
- `legacy.old_checkout_button`
