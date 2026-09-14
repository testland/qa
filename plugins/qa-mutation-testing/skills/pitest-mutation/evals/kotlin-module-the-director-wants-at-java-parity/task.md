# Kotlin module has to join the mutation gate at the same 80 as the Java ones

## Problem Description

`notify` is the only Kotlin module in the platform and the only one left out of
the mutation gate — it was written in 2025 after the gate policy was signed off
and nobody ever wired it in. Every Java module sits at 80.

Three things landed on me this week.

Our director wants `notify` in the gate at 80 by the end of the quarter, and she
wants a line for the board deck on Thursday. The wording she sent me to confirm
is "full mutation coverage across our Kotlin services, including coroutines",
and she wants a yes or a no, not a paragraph.

Our staff engineer has written in the thread that this is not possible at all —
that the tooling is Java-only, that running it against Kotlin output is
"mutating the compiler's work, not ours", and that we should hold the module out
of the gate until someone ships a Kotlin-native equivalent. He has asked for
that position to go in the deck instead.

Jo disagrees and has the only numbers anyone has produced. Somebody ran the
tooling on a scratch branch in August and got 51%. Jo then spent an afternoon on
it, landed QUAL-880, and the re-run came back 64% — thirteen points from one new
test file, with nothing in `NotificationRouter.kt` touched. Her proposal is that
we simply keep going the same way until we hit 80, and on the evidence she is
the only one of the three who has moved the number at all.

I have attached the module's build file, both runs with their survivor lists,
the change log for the module's tests, the router class, and every test file the
module has. There is tooling budget this quarter and there will not be one next
quarter, so if there is something we would have to buy to get further, now is
when I need to hear about it.

## Output Specification

1. Edit `notify/build.gradle.kts` so `./gradlew pitest` runs against the module.
2. Edit the test sources under `src/test/kotlin/com/acme/notify/` as your
   recommendation requires — add, change or remove whatever you are prepared to
   defend. Do not change `NotificationRouter.kt`.
3. Write `docs/notify-mutation-gate.md`: the gate figure you are setting and the
   measurement it comes from, a verdict on each group in the attached survivor
   list, the one sentence for the board deck, and an explicit ruling on both the
   staff engineer's position and Jo's proposal.

## Input Files

Extract the following files before beginning.

=============== FILE: notify/build.gradle.kts ===============
plugins {
    kotlin("jvm") version "2.0.21"
}

group = "com.acme"
version = "3.1.0-SNAPSHOT"

repositories { mavenCentral() }

dependencies {
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

kotlin { jvmToolchain(21) }

tasks.test {
    useJUnitPlatform()
}

=============== FILE: docs/gate-policy-java-modules.md ===============
# Platform mutation gate policy (2025-03, unchanged)

| module      | language | gate | last scheduled run |
|-------------|----------|------|--------------------|
| pricing     | Java     | 80   | 84                 |
| checkout    | Java     | 80   | 83                 |
| ledger      | Java     | 80   | 81                 |
| settlement  | Java     | 80   | 86                 |
| notify      | Kotlin   | —    | not in the gate    |

Gates were set from each module's measured score at the time it joined, then
ratcheted once, in 2025-09. The build fails below the gate.

=============== FILE: trial-run/pit-summary-scratch-branch.txt ===============
# notify — manual run on scratch branch `spike/notify-mutation`, 2026-08-19
# Run by hand with the Gradle plugin applied in a local, uncommitted build file.

>> Line Coverage (for mutated classes only): 388/441 (88%)
>> Generated 612 mutations Killed 312 (51%)
>> Mutations with no coverage 106. Test strength 58%
>> Ran 1,204 tests (1.97 tests per mutation)

=============== FILE: trial-run/rerun-2026-09-04.txt ===============
# notify — same scratch branch, re-run 2026-09-04 after QUAL-880 merged

>> Line Coverage (for mutated classes only): 402/441 (91%)
>> Generated 612 mutations Killed 392 (64%)
>> Mutations with no coverage 74. Test strength 71%
>> Ran 1,431 tests (2.34 tests per mutation)

## Surviving mutants, 220 total — report output, no classification applied

| location                                                              | operator                                        | count |
|-----------------------------------------------------------------------|-------------------------------------------------|-------|
| entry of every public function in the module                           | removed call to `Intrinsics::checkNotNullParameter`     | 68 |
| assignments from platform types across the module                      | removed call to `Intrinsics::checkNotNullExpressionValue` | 31 |
| `Delivery::component1` / `component2` / `component3`                   | replaced return value                            | 14 |
| `Delivery::copy$default`                                              | replaced return value / removed conditional      | 9  |
| `Delivery::hashCode`                                                  | replaced int return with 0                       | 7  |
| `RouteResult$Send::equals`                                            | replaced boolean return with true                | 6  |
| `NotificationRouter.kt:19`                                            | changed conditional boundary on `retries >= MAX_RETRIES` | 1 |
| `NotificationRouter.kt:28`                                            | replaced integer multiplication with division     | 1 |
| `NotificationRouter.kt:20`                                            | removed call to `Metrics::increment`              | 1 |
| the module's other 11 classes, not itemised here                      | mixed                                            | 82 |

=============== FILE: trial-run/test-changelog.md ===============
# notify — changes to src/test/kotlin this quarter

| date       | ticket   | who | change                                                     |
|------------|----------|-----|------------------------------------------------------------|
| 2026-06-11 | NOT-701  | mk  | `NotificationRouterTest.kt` — routing and backoff cases.    |
| 2026-09-02 | QUAL-880 | jo  | `GeneratedMembersTest.kt` added. New file, no other change. |

Nothing under `src/main/kotlin` has changed since 2026-06-11. Both runs above
mutate the same 612 mutants; the only difference between them is QUAL-880.

=============== FILE: src/main/kotlin/com/acme/notify/NotificationRouter.kt ===============
package com.acme.notify

enum class Channel { EMAIL, SMS, PUSH, WEBHOOK }

data class Delivery(val id: String, val channel: Channel, val retries: Int)

sealed interface RouteResult {
    data class Send(val transport: String, val delaySeconds: Int) : RouteResult
    data class Drop(val reason: String) : RouteResult
}

interface Metrics {
    fun increment(counter: String)
}

class NotificationRouter(private val metrics: Metrics) {

    fun route(delivery: Delivery): RouteResult {
        if (delivery.retries >= MAX_RETRIES) {
            metrics.increment("notify.dropped")
            return RouteResult.Drop("retry budget exhausted")
        }
        val delaySeconds = backoffSeconds(delivery.retries)
        return when (delivery.channel) {
            Channel.EMAIL -> RouteResult.Send("smtp", delaySeconds)
            Channel.SMS -> RouteResult.Send("twilio", delaySeconds)
            Channel.PUSH -> RouteResult.Send("fcm", delaySeconds)
            Channel.WEBHOOK -> RouteResult.Send("http", delaySeconds * 2)
        }
    }

    fun backoffSeconds(retries: Int): Int = when (retries) {
        0 -> 0
        1 -> 30
        else -> 30 * retries
    }

    companion object {
        const val MAX_RETRIES = 3
    }
}

=============== FILE: src/test/kotlin/com/acme/notify/NotificationRouterTest.kt ===============
package com.acme.notify

import kotlin.test.assertEquals
import org.junit.jupiter.api.Test

class NotificationRouterTest {

    private val recorded = mutableListOf<String>()
    private val metrics = object : Metrics {
        override fun increment(counter: String) { recorded += counter }
    }
    private val router = NotificationRouter(metrics)

    @Test
    fun `sends a first-attempt email immediately`() {
        val result = router.route(Delivery("d-1", Channel.EMAIL, retries = 0))
        assertEquals(RouteResult.Send("smtp", 0), result)
    }

    @Test
    fun `sends sms on the second attempt after the base backoff`() {
        val result = router.route(Delivery("d-2", Channel.SMS, retries = 1))
        assertEquals(RouteResult.Send("twilio", 30), result)
    }

    @Test
    fun `routes push through fcm`() {
        val result = router.route(Delivery("d-3", Channel.PUSH, retries = 1))
        assertEquals(RouteResult.Send("fcm", 30), result)
    }

    @Test
    fun `drops a delivery well past the retry budget`() {
        val result = router.route(Delivery("d-4", Channel.EMAIL, retries = 5))
        assertEquals(RouteResult.Drop("retry budget exhausted"), result)
    }

    @Test
    fun `backoff grows with the retry count`() {
        assertEquals(0, router.backoffSeconds(0))
        assertEquals(30, router.backoffSeconds(1))
        assertEquals(60, router.backoffSeconds(2))
    }
}

=============== FILE: src/test/kotlin/com/acme/notify/GeneratedMembersTest.kt ===============
package com.acme.notify

import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.Test

// QUAL-880 — added 2026-09-02 to bring the module's score up.
class GeneratedMembersTest {

    @Test
    fun `copy replaces one property and leaves the others`() {
        val d = Delivery("d-1", Channel.EMAIL, retries = 0)
        assertEquals(Delivery("d-1", Channel.SMS, retries = 0), d.copy(channel = Channel.SMS))
        assertEquals(Delivery("d-1", Channel.EMAIL, retries = 4), d.copy(retries = 4))
        assertEquals(d, d.copy())
    }

    @Test
    fun `destructuring returns the properties in declaration order`() {
        val (id, channel, retries) = Delivery("d-2", Channel.PUSH, retries = 2)
        assertEquals("d-2", id)
        assertEquals(Channel.PUSH, channel)
        assertEquals(2, retries)
    }

    @Test
    fun `equal deliveries are equal and hash alike`() {
        val a = Delivery("d-3", Channel.SMS, retries = 1)
        val b = Delivery("d-3", Channel.SMS, retries = 1)
        assertEquals(a, b)
        assertEquals(a.hashCode(), b.hashCode())
        assertNotEquals(a, Delivery("d-4", Channel.SMS, retries = 1))
        assertTrue(a.hashCode() != Delivery("d-4", Channel.SMS, retries = 1).hashCode())
    }

    @Test
    fun `send results compare on transport and delay`() {
        assertEquals(RouteResult.Send("smtp", 0), RouteResult.Send("smtp", 0))
        assertNotEquals(RouteResult.Send("smtp", 0), RouteResult.Send("smtp", 30))
        assertNotEquals(RouteResult.Send("smtp", 0), RouteResult.Send("twilio", 0))
    }

    @Test
    fun `drop results compare on reason`() {
        assertEquals(RouteResult.Drop("retry budget exhausted"), RouteResult.Drop("retry budget exhausted"))
        assertNotEquals(RouteResult.Drop("a"), RouteResult.Drop("b"))
        assertEquals(RouteResult.Drop("a").hashCode(), RouteResult.Drop("a").hashCode())
    }

    @Test
    fun `toString carries the property values`() {
        assertTrue(Delivery("d-5", Channel.WEBHOOK, retries = 2).toString().contains("d-5"))
        assertTrue(RouteResult.Send("http", 60).toString().contains("http"))
    }
}
