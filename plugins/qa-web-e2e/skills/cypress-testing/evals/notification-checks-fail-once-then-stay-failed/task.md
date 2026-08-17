# Inbox checks fail on the first look and never look again

## Problem Description

`cypress/e2e/notifications.cy.ts` fails about one CI run in four, always on the
unread badge. The badge is rendered immediately with its old value and updated
a moment later when the mark-read call comes back. Locally the update lands
before the check; on a loaded CI runner it does not, and the run fails on the
first look with `expected '4' to equal '3'`.

Someone raised the timeout on the element lookup to ten seconds. That made no
difference, which nobody could explain - the element is there instantly, it is
its text that is stale.

The toast test has a different problem: it closes the toast from inside the
same block that checks the toast's text, and on CI we sometimes see the close
button clicked several times, and once an error that the button had been
detached.

The third test is the one that worries us most, because it has never failed.
It asserts that no error toast appears after a save. It passes in about forty
milliseconds - before the save round trip could possibly have returned - so it
would also pass if every save failed loudly. We want it to actually mean
something.

## Output Specification

Rework `cypress/e2e/notifications.cy.ts` so that:

1. Each value check waits for the value to become what is expected, rather than
   failing on the first look at a stale one.
2. Nothing that changes the page happens inside a block that may be evaluated
   repeatedly.
3. The "no error toast" test can only pass after the save has visibly
   completed, so it would fail if an error toast appeared.
4. All three behaviours stay covered.
5. No fixed pauses, and no raising of timeouts as the primary fix.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/notifications.cy.ts ===============
describe('Notifications', () => {
  beforeEach(() => {
    cy.visit('/inbox');
  });

  it('drops the unread badge when a message is marked read', () => {
    cy.findByTestId('unread-badge').then(($badge) => {
      expect($badge.text()).to.eq('4');
    });

    cy.findAllByRole('listitem')
      .first()
      .findByRole('button', { name: /mark read/i })
      .click();

    cy.findByTestId('unread-badge', { timeout: 10000 }).then(($badge) => {
      expect($badge.text()).to.eq('3');
    });
  });

  it('closes the archive toast', () => {
    cy.findAllByRole('listitem')
      .first()
      .findByRole('button', { name: /archive/i })
      .click();

    cy.get('[data-testid="toast"]').should(($toast) => {
      expect($toast).to.contain.text('Archived');
      $toast.find('button.toast-close').trigger('click');
    });

    cy.get('[data-testid="toast"]').should('not.exist');
  });

  it('shows no error toast when the draft saves', () => {
    cy.findByRole('button', { name: /save draft/i }).click();
    cy.get('[data-testid="error-toast"]').should('not.exist');
  });
});

=============== FILE: cypress/support/commands.ts ===============
import '@testing-library/cypress/add-commands';

=============== FILE: cypress/support/e2e.ts ===============
import './commands';

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "scripts": {
    "e2e": "cypress run"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "cypress": "^13.15.0"
  }
}
