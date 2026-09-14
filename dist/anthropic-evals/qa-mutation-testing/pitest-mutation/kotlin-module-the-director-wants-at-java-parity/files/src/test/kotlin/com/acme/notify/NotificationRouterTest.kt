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
