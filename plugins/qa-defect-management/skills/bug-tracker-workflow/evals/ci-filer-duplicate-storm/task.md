# Our CI job opened 16 tickets for one flaky test

## Problem Description

A checkout test has been failing intermittently for two weeks. In that time the
job that files tickets from failed runs opened sixteen of them, and the board
is now unusable for anyone triaging that area. Two of the sixteen are not the
same failure at all - the same test file started failing a second assertion
after a refactor - and I do not want those swept away with the rest.

The job did have something in it meant to prevent this, and it still produced
this result. On 5 August the tracker's search endpoint was returning 403s for
about an hour and the job filed two tickets during that window.

The script is also a security problem in its own right, which the platform team
noticed when it was pasted into a channel.

## Output Specification

Produce exactly two files:

1. `filer-fix.md` - what the job must do before it opens anything, what it must
   do when it recurs, and specifically what it must do when the lookup it
   depends on is itself unavailable, as it was on 5 August. Explain what the
   current script actually did on that day and why. Cover the security problem.
   Quote the exact line or lines of the script each change replaces.
2. `issue-cleanup.csv` - one row per existing ticket, columns
   `number,action,target,reason`, covering all sixteen. Tickets that must be
   left alone get a row saying so.

Out of scope: fixing the flaky test itself, and any change to the test suite.
Do not propose a new tracker or a new tool.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/auto-filed.csv ===============
number,title,state,labels,created,failure_signature,body_contents
5101,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-01,"assert_cart_total@checkout_spec.rb:212","full stack trace, runner image, commit sha, link to run 91002"
5104,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-02,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91188"
5106,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-03,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91290"
5109,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-04,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91355"
5112,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-05,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91401; filed during the hour the search endpoint returned 403"
5113,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-05,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91409; filed during the hour the search endpoint returned 403"
5115,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-06,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91470"
5117,"CI failure: checkout_spec.rb:388 assert_refund_total",open,"bug,auto-filed,ci-failure",2026-08-07,"assert_refund_total@checkout_spec.rb:388","stack trace shows the refund ledger path, link to run 91533"
5118,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-07,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91549"
5119,"CI failure: checkout_spec.rb:401 assert_invoice_lines",open,"bug,auto-filed,ci-failure",2026-08-08,"assert_invoice_lines@checkout_spec.rb:401","stack trace shows the invoice renderer, link to run 91602"
5121,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-09,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91655"
5123,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-10,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91701"
5124,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-11,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91760"
5126,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-12,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91812"
5128,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-13,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91877"
5130,"CI failure: checkout_spec.rb:212 assert_cart_total",open,"bug,auto-filed,ci-failure",2026-08-14,"assert_cart_total@checkout_spec.rb:212","one-line failure, link to run 91930"

=============== FILE: ci/file_bug.py ===============
import requests, sys, json

TOKEN = "ghp_9Xk2LqR7vTn4Ba1ZcWm0PdYs5HjUf3Gt8Q"
REPO = "acme/web"
HEADERS = {"Authorization": f"Bearer {TOKEN}",
           "Accept": "application/vnd.github+json"}


def find_existing(title):
    try:
        r = requests.get("https://api.github.com/search/issues",
                         params={"q": f'repo:{REPO} is:open label:ci-failure "{title}"'},
                         headers=HEADERS)
        return r.json().get("items", [])
    except Exception:
        return []


def file_bug(title, body):
    hits = find_existing(title)
    if hits:
        requests.post(
            f"https://api.github.com/repos/{REPO}/issues/{hits[0]['number']}/comments",
            json={"body": body}, headers=HEADERS)
        return hits[0]["number"]
    r = requests.post(f"https://api.github.com/repos/{REPO}/issues",
                      json={"title": title, "body": body,
                            "labels": ["bug", "auto-filed", "ci-failure"]},
                      headers=HEADERS)
    return r.json()["number"]


if __name__ == "__main__":
    failure = json.load(open(sys.argv[1]))
    print(file_bug(f"CI failure: {failure['location']} {failure['assertion']}",
                   failure["message"]))
