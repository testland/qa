# Job ad goes out Monday and it needs to name our test stack

## Problem Description

We are two weeks old. Four of us, seed money closed on 2026-08-31, and I am the
founding engineer. The job ad for our first two hires goes out on Monday
2026-09-21 and our recruiter is adamant that ads naming a concrete stack get
roughly twice the applications of ads that say "modern tooling". She is
probably right and I would like to give her something specific.

So I need two calls made today, not "when things settle down":

**Web.** Pick the end-to-end tool for the web app. It is a Next.js prototype;
I built it in nine days and I am still moving routes around most mornings. The
repo is attached, including the two architecture RFCs that are still open —
one on whether we go monolith or split the frontend, one on the backend
language, where Go and Kotlin are genuinely neck and neck and the deciding
factor is honestly which of the two candidates we like more.

**Mobile.** Pick the mobile tool. The iOS app is the real one — my co-founder
has been on it since the start, it has actual UI tests in it already, and it is
what we demo. Android is on the roadmap for H2 next year. Given that, please go
with something cross-platform so we are not throwing work away in twelve
months; I have been burned before by picking the narrow thing first.

I know two weeks is early. I also know that "we'll decide later" is not a line
I can put in a job ad, and every week I leave this open is a week of tests
nobody is writing.

## Output Specification

1. Write `docs/web-e2e-decision.md` — your answer on the web tool.
2. Write `docs/mobile-decision.md` — your answer on the mobile tool.
3. Write `docs/job-ad-tooling.md` — exactly the tooling lines you would put in
   Monday's advert, and nothing you would not stand behind in an interview.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "@fathom/web",
  "version": "0.0.3",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "node --test"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "typescript": "5.6.2"
  }
}

=============== FILE: app/page.tsx ===============
export default function Home() {
  return (
    <main>
      <h1>Fathom</h1>
      <p>Waitlist coming back tomorrow, moved to /early for now.</p>
    </main>
  );
}

=============== FILE: docs/rfc-001-backend-language.md ===============
# RFC 001 - Backend language

**Status:** open. Opened 2026-09-03. No decision.

Go or Kotlin. Both of us have written both. The two engineers we are
interviewing split one each, and whichever we hire will own the service for the
next two years, so the honest position is that the hire decides this.

No service code has been written. The prototype talks to a hosted backend we
will replace.

**Blocked on:** the two offers, expected late October.

=============== FILE: docs/rfc-002-frontend-architecture.md ===============
# RFC 002 - One app or several

**Status:** open. Opened 2026-09-09. No decision.

The dashboard and the marketing site are one Next.js app today because it was
the fastest thing to build. If the dashboard becomes a separate deployable, the
routes, the auth boundary and everything a browser test would navigate through
change shape.

**Blocked on:** whether the first enterprise pilot needs an on-prem dashboard.
We find out at the pilot call, currently pencilled for 2026-10-15.

=============== FILE: docs/roadmap-notes.md ===============
# Roadmap notes - 2026-09-11

- iOS: demo build ships to TestFlight fortnightly. This is what customers see.
- Android: H2 2027 at the earliest. Nothing built, nobody assigned, not
  costed. It is on the roadmap because two design partners asked about it.
- Web: routes still moving. The waitlist page has moved twice this week and
  the dashboard shell is a placeholder.

=============== FILE: ios/Fathom.xcodeproj/project.pbxproj.excerpt ===============
/* Excerpt - test targets only */
		A1B2C3D41 /* FathomUITests */ = {
			isa = PBXNativeTarget;
			name = FathomUITests;
			productType = "com.apple.product-type.bundle.ui-testing";
		};
		A1B2C3D42 /* FathomTests */ = {
			isa = PBXNativeTarget;
			name = FathomTests;
			productType = "com.apple.product-type.bundle.unit-test";
		};

=============== FILE: ios/FathomUITests/OnboardingUITests.swift ===============
import XCTest

final class OnboardingUITests: XCTestCase {

    func testWaitlistSignUpShowsConfirmation() {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Join the waitlist"].tap()
        app.textFields["email"].typeText("ada@example.com")
        app.buttons["Submit"].tap()
        XCTAssertTrue(app.staticTexts["You're on the list"].waitForExistence(timeout: 5))
    }

    func testOnboardingCanBeSkipped() {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Skip"].tap()
        XCTAssertTrue(app.otherElements["home-screen"].exists)
    }
}

=============== FILE: tools/src/waitlist.js ===============
function normaliseEmail(input) {
  if (typeof input !== 'string') throw new TypeError('email must be a string');
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.includes('@')) throw new RangeError('not an email address');
  return trimmed;
}

module.exports = { normaliseEmail };

=============== FILE: tools/tests/waitlist.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliseEmail } = require('../src/waitlist.js');

test('addresses are trimmed and lowercased', () => {
  assert.equal(normaliseEmail('  Ada@Example.COM '), 'ada@example.com');
});

test('a non-string is rejected', () => {
  assert.throws(() => normaliseEmail(42), TypeError);
});

test('something without an at-sign is rejected', () => {
  assert.throws(() => normaliseEmail('ada.example.com'), RangeError);
});
