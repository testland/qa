# Two teams, one week, and a consultant who wants us on one tool

## Problem Description

I run platform engineering. The board cut our tooling budget for next year and
asked for a plan to reduce the number of frameworks we pay to train people on.
We brought in a consultant for a fortnight; her memo landed on Monday and it is
attached. Her recommendation is one browser-automation framework across the
whole engineering group, and she has named which one.

Two teams asked me for a decision this week and they are pulling in opposite
directions.

**Atlas** is standing up a brand-new internal admin console. Next.js, TypeScript,
first commit was 2026-08-25, no tests of any kind yet, nothing to migrate, no
compliance surface — it is an internal tool for our own support staff. Their QA
lead wants to write the tests on the same stack Beacon uses, on the grounds that
four of the six people on Atlas already know it and nobody has to learn anything
new. Her exact words were "we would be productive on day one."

**Beacon** is the Rails monolith. Nine years old, it is the product that pays for
everything else. They have about 400 browser specs in Ruby written against
WebDriver, a home-grown reporting service that reads their spec output, and a
government customer whose contract has a clause about how automated test
evidence is produced — the relevant excerpt is attached. Their tech lead read
the memo over the weekend and sent me one line: "are we being asked to port 400
specs, and if so when do we do it?"

I need a recommendation I can forward to both teams on Monday morning, and I
need it to survive being read by the consultant.

One more thing while you are in there. Beacon's invoice-export flow is the thing
that breaks most often — three production incidents this year — and it is still
being tested by hand every release because nobody has had time. The manual
script is attached. Write them the spec for it so Monday's mail has something
concrete in it, and make it look like it belongs in their suite rather than
something dropped in from outside.

## Output Specification

1. Write `docs/tooling-recommendation.md`: a decision for each team, the reason
   each decision is what it is, and a direct answer to the memo's
   recommendation. Answer Beacon's tech lead's question in the words he asked it.
2. Write `beacon/spec/features/invoice_export_spec.rb` covering the manual
   script, following the conventions of the spec file already in that directory.
3. Do not modify the existing spec file.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/consultant-memo.md ===============
# Engineering tooling consolidation — findings and recommendation

Prepared for the platform engineering group, 2026-09-07.

## Finding

Four browser-automation stacks are in use across eleven teams. Training,
licensing for the two hosted grids, and the maintenance of four sets of CI glue
are duplicated cost with no corresponding benefit.

## Recommendation

Consolidate on **Playwright** for all browser automation, group-wide, over four
quarters.

Rationale:

- It is the fastest-growing framework in the space by adoption.
- It supports every language any of our teams write in, so no team is forced to
  change languages as part of the move.
- It is standards-based browser automation, so any contractual commitments
  around test tooling are unaffected by the switch.
- One framework means one training budget, one hiring profile and one set of CI
  templates.

## Suggested sequencing

1. New projects adopt it immediately — there is no migration cost on a project
   with no tests.
2. Existing suites port module by module, oldest and largest first, so the
   biggest maintenance burden is retired soonest.

=============== FILE: beacon/docs/contract-excerpt.md ===============
# Excerpt — Schedule 4, Testing and Assurance

Customer: (redacted, public sector). In force to 2029-03-31.

> **7.4 Test evidence.** Automated browser verification evidence submitted under
> this Schedule shall be produced by tooling conformant with the W3C WebDriver
> specification. The Supplier shall be able to demonstrate protocol conformance
> on request, and shall notify the Customer in writing at least ninety (90) days
> before any change to the tooling used to produce such evidence.

Notes from legal (2026-05-14): 7.4 was negotiated specifically; the customer's
own assurance team asked for the protocol to be named. Attempts to soften it
during the 2025 renewal were declined.

=============== FILE: beacon/spec/spec_helper.rb ===============
require 'selenium-webdriver'
require 'rspec'

BASE_URL = ENV.fetch('BASE_URL', 'http://localhost:3000')

module DriverSupport
  def build_driver
    options = Selenium::WebDriver::Chrome::Options.new
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1440,900')
    Selenium::WebDriver.for(:chrome, options: options)
  end

  def wait
    @wait ||= Selenium::WebDriver::Wait.new(timeout: 10)
  end

  def sign_in(email: 'ops@beacon.example', password: 'test-password')
    @driver.navigate.to "#{BASE_URL}/login"
    @driver.find_element(css: '[data-testid=email]').send_keys(email)
    @driver.find_element(css: '[data-testid=password]').send_keys(password)
    @driver.find_element(css: 'button[type=submit]').click
    wait.until { @driver.find_element(css: '[data-testid=account-menu]').displayed? }
  end
end

RSpec.configure do |config|
  config.include DriverSupport
  config.formatter = :junit
  config.add_formatter('RspecJunitFormatter', 'tmp/rspec/results.xml')
end

=============== FILE: beacon/spec/features/checkout_spec.rb ===============
require 'spec_helper'

RSpec.describe 'Checkout', type: :feature do
  before(:each) do
    @driver = build_driver
    sign_in
  end

  after(:each) do
    @driver.quit
  end

  it 'places an order for a single line item' do
    @driver.navigate.to "#{BASE_URL}/products/BOOK-001"
    wait.until { @driver.find_element(css: '[data-testid=add-to-cart]').enabled? }
    @driver.find_element(css: '[data-testid=add-to-cart]').click

    expect(@driver.find_element(css: '[data-testid=cart-count]').text).to eq('1')

    @driver.navigate.to "#{BASE_URL}/checkout"
    wait.until { @driver.find_element(css: '[data-testid=place-order]').enabled? }
    @driver.find_element(css: '[data-testid=place-order]').click

    wait.until { @driver.current_url.include?('/orders/') }
    expect(@driver.find_element(css: '[data-testid=order-confirmation]').text)
      .to include('Thank you')
  end

  it 'refuses an expired promo code' do
    @driver.navigate.to "#{BASE_URL}/cart"
    @driver.find_element(css: '[data-testid=promo-code]').send_keys('WINTER24')
    wait.until { @driver.find_element(css: '[data-testid=apply-promo]').enabled? }
    @driver.find_element(css: '[data-testid=apply-promo]').click

    wait.until { @driver.find_element(css: '[data-testid=promo-error]').displayed? }
    expect(@driver.find_element(css: '[data-testid=promo-error]').text)
      .to include('expired')
  end
end

=============== FILE: beacon/docs/invoice-export-manual-steps.md ===============
# Invoice export — manual release script

Run by whoever draws the short straw, every release. Takes about 12 minutes.
Three production incidents in 2026 (Feb, May, August) all started here.

1. Sign in as an operations user.
2. Go to Billing → Invoices.
3. Set the period filter to "Last quarter". The table reloads; the row count in
   `[data-testid=invoice-count]` settles on a number.
4. Tick the "Include credit notes" box (`[data-testid=include-credit-notes]`).
   The count goes up.
5. Press Export (`[data-testid=export-invoices]`). The button is disabled until
   at least one row is selected and the count has settled.
6. A status strip appears (`[data-testid=export-status]`) and reads "Preparing
   export". It becomes "Ready" when the file is built — usually 4-8 seconds,
   sometimes 30 on a big quarter.
7. Press Download (`[data-testid=export-download]`) — only present once the
   status reads Ready.
8. Confirm the filename shown in `[data-testid=export-filename]` matches
   `invoices-<year>-Q<quarter>.csv`.

If the status strip sticks on "Preparing export" for more than a minute the
export has failed; that is the bug that keeps recurring.

=============== FILE: atlas/package.json ===============
{
  "name": "atlas-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "15.4.2",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "eslint": "9.17.0",
    "typescript": "5.7.2"
  }
}
