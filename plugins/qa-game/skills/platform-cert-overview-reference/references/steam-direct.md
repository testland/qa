# Steam Direct - reference

Full Steam Direct regime detail for platform-cert-overview-reference.

## Source of truth

- **Application:** [partner.steamgames.com/doc/store/application](https://partner.steamgames.com/doc/store/application)
- **Fee:** [Steam Direct Fee](https://partner.steamgames.com/doc/gettingstarted/appfee)
- **Content Survey:** [partner.steamgames.com/doc/gettingstarted/contentsurvey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)
- **Review Process:** [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process)

## Workflow

Per the
[App Review Process](https://partner.steamgames.com/doc/store/review_process):

1. Developer purchases the Steam Direct Fee or obtains an app
   credit; creates the application in Steamworks.
2. Developer completes the **Content Survey** (age ratings, content
   warnings).
3. Developer marks the title "ready for review" - two parallel
   reviews begin:
   - **Store Presence Review** - 3-5 business days (plan for 7).
   - **Product Build Review** - 3-5 business days (plan for 7).
4. On approval, the title can be released on its scheduled date.

Per the same page: "Once your game has been reviewed and
approved, there is no need to go through review again."

## What is reviewed

Per the same page, the **Store Presence Review** checks:

- "Your store page should only contain features and content that
  will be available at launch."
- "Capsule images must display readable product titles / logos."
- "Screenshots must show only gameplay, excluding concept art or
  marketing materials."
- Description quality, no external links.

The **Product Build Review** checks:

- "Your product will need to start up properly" across all listed
  OSes.
- "All supported features listed on the store page will need to be
  implemented."
- "Your product must use Steam Wallet for any in-game
  transactions."

## Special categories

Per the same page:

- **Early Access** - requires answering all Early Access section
  questions before review.
- **Adult Content** - both store-page and build review required;
  may exceed standard timeframes.
- **Trading Cards** - separate 3 - 5 business day review for card
  assets and drop configurations.

## Comparison to console cert

Steam Direct is **dramatically lighter** than the three console
regimes: no equivalent of Xbox XR test cases, no equivalent of
Sony TRC bench matrix, no equivalent of Nintendo handheld / docked
test surface. The bar is "starts up + features match store page +
uses Steam Wallet for IAP" rather than a multi-stage cert pass.
