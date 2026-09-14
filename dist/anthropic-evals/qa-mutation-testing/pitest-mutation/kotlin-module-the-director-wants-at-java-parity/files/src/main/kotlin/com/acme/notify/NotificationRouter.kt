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
