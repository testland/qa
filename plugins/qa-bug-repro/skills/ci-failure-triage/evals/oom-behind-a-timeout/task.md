# Nightly checkout shard keeps dying on a 60s hook timeout

## Problem Description

The nightly build has been red for three nights. Shard 3 of the checkout suite
fails in `order-history.spec.ts` with a hook timeout. We already raised
`testTimeout` from 30s to 60s on Monday; the job now fails at 60s instead of
30s, so that bought us nothing.

The working theory in the channel is that the order-history screen got slower
after last week's gift-card work, and someone is about to open a performance
ticket against the checkout team. The checkout team pushed back because their
change was a header component, but nobody has evidence either way.

We cut the release branch tomorrow morning. Before anyone opens a ticket or
edits a test, we want a written call on what this failure actually is and who
should be picking it up, backed by what is in the job output rather than by
what the summary line says.

## Output Specification

Produce `triage-nightly-9871.md` containing:

1. What kind of failure this is and which team or role owns the next action.
2. The evidence from the attached files that supports that call, quoting the
   specific lines and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. The immediate next action, stated so someone else can carry it out.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: changing any test, workflow file, or application code; writing a
bug-report form; proposing a performance fix.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/nightly-9871.log ===============
2026-08-12T02:14:03.1180216Z Current runner version: '2.319.1'
2026-08-12T02:14:03.1207781Z ##[group]Runner Image
2026-08-12T02:14:03.1208422Z Image: ubuntu-22.04
2026-08-12T02:14:03.1208995Z Version: 20260803.1.0
2026-08-12T02:14:03.1209502Z Runner label: ubuntu-latest
2026-08-12T02:14:03.1210110Z Hardware: 2 vCPU / 7 GB RAM / 14 GB SSD
2026-08-12T02:14:03.1210688Z ##[endgroup]
2026-08-12T02:14:09.4410023Z ##[group]Run npm ci
2026-08-12T02:14:41.8830912Z added 1187 packages, and audited 1188 packages in 32s
2026-08-12T02:14:41.9021144Z ##[endgroup]
2026-08-12T02:14:42.0110455Z ##[group]Run npx jest --shard=3/4 --ci --maxWorkers=2
2026-08-12T02:14:55.2210781Z PASS tests/checkout/cart.spec.ts (11.882 s)
2026-08-12T02:15:22.7710233Z PASS tests/checkout/promo.spec.ts (26.401 s)
2026-08-12T02:15:49.1140882Z PASS tests/checkout/gift-card-header.spec.ts (9.117 s)
2026-08-12T02:16:31.0022771Z
2026-08-12T02:16:31.0023001Z <--- Last few GCs --->
2026-08-12T02:16:31.0023388Z [4127:0x5f10d40] 106881 ms: Mark-Compact 3947.1 (4127.5) -> 3946.2 (4128.7) MB, 1802.44 / 0.00 ms  (average mu = 0.104, current mu = 0.031) allocation failure; scavenge might not succeed
2026-08-12T02:16:31.0024103Z [4127:0x5f10d40] 108772 ms: Mark-Compact 3948.0 (4128.7) -> 3947.1 (4129.2) MB, 1839.11 / 0.00 ms  (average mu = 0.061, current mu = 0.027) allocation failure; scavenge might not succeed
2026-08-12T02:16:31.0024790Z
2026-08-12T02:16:31.0025301Z <--- JS stacktrace --->
2026-08-12T02:16:31.0025902Z FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
2026-08-12T02:16:31.0026588Z  1: 0xb8a3c0 node::Abort() [node]
2026-08-12T02:16:31.0027140Z  2: 0xa9b8f4 node::OnFatalError(char const*, char const*) [node]
2026-08-12T02:16:31.0027744Z  3: 0xd6a1c0 v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [node]
2026-08-12T02:16:31.0028302Z  4: 0xd6a4f7 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [node]
2026-08-12T02:16:31.0028915Z  5: 0xf4c265 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, ...) [node]
2026-08-12T02:17:31.5510334Z A jest worker process (pid=4127) was terminated by another process: signal=SIGKILL, exitCode=null. Operating system logs may contain more information on why this occurred.
2026-08-12T02:17:31.5512001Z
2026-08-12T02:17:31.5610882Z  FAIL  tests/checkout/order-history.spec.ts
2026-08-12T02:17:31.5611904Z   ● renders 200 past orders › beforeAll
2026-08-12T02:17:31.5612677Z     thrown: "Exceeded timeout of 60000 ms for a hook.
2026-08-12T02:17:31.5613391Z     Add a timeout value to this test to increase the timeout, if this is a long-running test."
2026-08-12T02:17:31.5614066Z       16 | describe('renders 200 past orders', () => {
2026-08-12T02:17:31.5614702Z     > 18 |   beforeAll(async () => {
2026-08-12T02:17:31.5615288Z       19 |     await seedOrders(200);
2026-08-12T02:17:31.5615901Z       at tests/checkout/order-history.spec.ts:18:3
2026-08-12T02:17:32.9910447Z Test Suites: 1 failed, 3 passed, 4 total
2026-08-12T02:17:32.9911109Z Tests:       1 failed, 74 passed, 75 total
2026-08-12T02:17:32.9911788Z Time:        170.9 s
2026-08-12T02:17:33.0410992Z ##[group]Post job cleanup: kernel ring buffer (last 3 lines)
2026-08-12T02:17:33.0411307Z [ 4211.771820] node invoked oom-killer: gfp_mask=0x1100cca, order=0, oom_score_adj=0
2026-08-12T02:17:33.0411788Z [ 4213.882014] Out of memory: Killed process 4127 (node) total-vm:5312104kB, anon-rss:4021884kB, file-rss:0kB, shmem-rss:0kB, UID:1001 pgtables:9284kB oom_score_adj:0
2026-08-12T02:17:33.0412511Z ##[endgroup]
2026-08-12T02:17:33.1220334Z ##[error]Process completed with exit code 137.

=============== FILE: ci/job-history.tsv ===============
run_id	finished_at	runner_label	shard	result	duration	failing_test
9871	2026-08-12T02:17	ubuntu-latest	3/4	fail	2m51s	order-history.spec.ts
9852	2026-08-11T02:16	ubuntu-latest	3/4	fail	2m48s	order-history.spec.ts
9833	2026-08-10T20:41	ubuntu-latest	3/4	fail	2m55s	order-history.spec.ts
9829	2026-08-10T13:58	ubuntu-latest-8-cores	3/4	pass	2m12s	-
9812	2026-08-09T02:15	ubuntu-latest-8-cores	3/4	pass	2m09s	-
9795	2026-08-08T02:15	ubuntu-latest-8-cores	3/4	pass	2m11s	-
# rows 9401 through 9795 (47 runs, 2026-07-04 to 2026-08-08): all pass,
# runner_label=ubuntu-latest-8-cores (8 vCPU / 32 GB), shard 3/4 duration 2m05s-2m19s.
# order-history.spec.ts has never appeared in this 50-run window before run 9833.
# No quarantine or flake-list entry exists for any test in this repository.

=============== FILE: ci/window-changes.txt ===============
$ git log --oneline --since=2026-08-08 --until=2026-08-12
a11c93e (2026-08-10 14:02) ci: move the nightly job to the standard runner pool
7f20b6d (2026-08-09 11:40) feat(checkout): show gift-card balance in the order-history header
c0d4471 (2026-08-08 16:05) docs: update the release checklist

$ git show a11c93e -- .github/workflows/nightly.yml
@@ jobs:
   nightly-suite:
-    runs-on: ubuntu-latest-8-cores
+    runs-on: ubuntu-latest
     strategy:
       matrix:
         shard: [1, 2, 3, 4]

$ git show 7f20b6d --stat
 src/checkout/OrderHistoryHeader.tsx        | 14 ++++++++++----
 src/checkout/OrderHistoryHeader.module.css |  6 ++++++
 2 files changed, 16 insertions(+), 4 deletions(-)

$ git show 7f20b6d -- src/checkout/OrderHistoryHeader.tsx
@@ export function OrderHistoryHeader({ account }: Props) {
   return (
     <header className={styles.header}>
       <h2>Order history</h2>
+      {account.giftCardBalance > 0 && (
+        <span className={styles.balance}>Gift card: {format(account.giftCardBalance)}</span>
+      )}
     </header>
   );
 }

$ git log --oneline --since=2026-08-08 -- src/checkout/orderHistory.ts src/checkout/seedOrders.ts
(no commits)
