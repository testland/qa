@Composable
fun PayButton(price: String, onPay: () -> Unit) {
    Button(onClick = onPay) {
        Column {
            Text("Pay now")
            Text(price, style = MaterialTheme.typography.labelSmall)
        }
    }
}
// "Payment confirmed" is a Compose Text shown after the suspend payment call returns.
