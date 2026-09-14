# Base test hierarchy

From the "Scaling Test Suites Past 1000 Cases" talk, TestCon 2025. Proposed
by @tomas for sprint one.

    BaseTest
      - launches and closes the browser
      - screenshot on failure
      - captures console errors and fails the test if any are ERROR level

      AuthenticatedTest extends BaseTest
        - signs in as the seeded operations user during setUp()
        - exposes this.session

        MerchantTest extends AuthenticatedTest
          - seeds one merchant during setUp(), stores it as this.merchant
          - navigates to /merchants

          PayoutTest extends MerchantTest
            - seeds three payouts against this.merchant
            - navigates to /payouts

Every spec extends the deepest class that fits. New shared behaviour goes
into the level where it is first needed, and everything below inherits it.

Marcus's pilot in `pilot/` is the same idea expressed as a module rather than
a class hierarchy, to show the setup sharing works before we commit to the
class shape.
