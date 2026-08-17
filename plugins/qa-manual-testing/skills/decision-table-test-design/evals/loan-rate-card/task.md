# Rate card review before the pricing engine goes in

## Problem Description

We are replacing the spreadsheet that prices consumer loans with a service, and
the rate card below is the whole of the specification. It reads as a stack of
independent adjustments to a base rate, and the previous attempt at this went
badly because someone built a test list by writing one case per line of the card
and shipped a bug in the interaction between two of them.

Five separate facts about an application appear in the card. Two of them are
about the same underlying number, which the sales team keeps pointing out is
confusing. One adjustment is written as conditional on another fact, so it
quietly does nothing for part of the applicant population.

I want a review document that lays out what rate every genuinely different kind
of application gets, and is honest about how big the test list actually needs to
be. Underwriting will sit in the review, so anything the card leaves open needs
to be a question on the page rather than a number someone invented.

## Output Specification

Produce `loan-rate-card-analysis.md` containing:

1. The facts about an application that the card prices on, one per line.
2. How many different applications the card can in principle describe, and how
   many of those can actually exist - some pairs of these facts cannot both hold.
3. A table of the genuinely different kinds of application with the rate each
   gets, and a sentence saying how you got from the first number to the size of
   this table.
4. Any fact that makes no difference to the rate for part of the population,
   said explicitly.
5. Anything the card does not settle, as an open question for underwriting.
6. The list of applications QA should price, with a count.

Out of scope: affordability checks, fee income, and any code. Rates only,
expressed in APR points. This is a review document.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/rate-card.md ===============
# Consumer loan rate card, 2026 H2

Base rate: 9.9% APR.

An applicant with a credit score of 700 or above gets 1.5 points off the base
rate.

An applicant with a credit score of 780 or above gets 2.5 points off instead of
the 1.5.

A loan with a term longer than 60 months adds 0.8 points.

An applicant who already holds a current account with us gets 0.3 points off.

A loan of EUR 25,000 or more gets a further 0.4 points off, but only where the
credit score is 700 or above. Below 700 the large-loan discount is not applied.

Adjustments are cumulative and are applied to the base rate in any order.

Applications scoring below 700 on a term longer than 60 months are referred to
underwriting. The rate card still prints a price for them.
