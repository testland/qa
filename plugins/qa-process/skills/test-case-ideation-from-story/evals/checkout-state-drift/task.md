# Checkout incidents all happen between page load and payment

## Problem Description

CHK-660 replaces the multi-step checkout with a single "Pay now" action on the
cart page. The tech design has been pasted into the story.

Our last three incidents on the current checkout have one thing in common:
none of them was in the payment code, and none of them reproduced when a tester
walked the flow start to finish in one go. In each case something about the
order was true when the page rendered and no longer true when the money moved.
The existing test list covers declined cards, expired cards and wrong CVV very
thoroughly, and covered none of the three.

We want the case list before this is built, and we want it to be usable in a
year: the tech design in the story will not survive contact with the sprint,
and the last list we wrote had to be rewritten when the endpoints were renamed.

## Output Specification

1. Produce `docs/test-cases/CHK-660.md` containing a single markdown table for
   the manual pass.
2. Each row must state the state the system has to be in before the action, and
   what a tester can observe afterwards.
3. Out of scope: automated tests, load testing, and the payment provider's own
   3-D Secure screens.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/CHK-660.md ===============
# CHK-660 — One-click Pay now on the cart page

**Type:** Story
**Squad:** Checkout

## Story

As a returning shopper with a saved card, I want to pay for my cart without
walking through three screens, so that I can check out in one action.

## Acceptance criteria

- AC-1: The cart page shows a "Pay now" action for shoppers with a saved card
  and a saved delivery address.
- AC-2: Pressing it charges the saved card for the cart total including
  delivery and tax, and creates the order.
- AC-3: The shopper lands on an order confirmation page showing the order
  number and the amount charged.
- AC-4: A confirmation email is sent.
- AC-5: Stock is decremented for every line in the order.

## Tech design (pasted from the RFC)

The button is the `<PayNowButton>` component on the cart route. It posts to
`POST /v3/checkout/confirm` with the cart id.

The handler creates a `PaymentIntent` at the provider, writes a row to
`orders_staging`, waits for the provider's synchronous confirmation, then
promotes the staging row into `orders` and enqueues the email job. Stock is
decremented in the same transaction as the promotion.

The provider call has a 20-second timeout. Cart contents and prices are read
once when the cart page renders and are held in the client until submit.

Session tokens are valid for 30 minutes and are not refreshed by activity on
the cart page.
