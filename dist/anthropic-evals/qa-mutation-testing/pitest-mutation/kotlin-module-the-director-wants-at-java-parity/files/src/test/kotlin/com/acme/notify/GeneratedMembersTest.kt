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
