package com.northwind.shop

import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executor

class VaultUnlock(
    private val activity: FragmentActivity,
    private val executor: Executor,
    private val onUnlocked: () -> Unit,
) {

    private val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Unlock saved cards")
        .setSubtitle("Confirm it is you before we show your cards")
        .setNegativeButtonText("Use my password instead")
        .build()

    fun start() {
        BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onUnlocked()
            }

            override fun onAuthenticationError(code: Int, message: CharSequence) {
                activity.findViewById<android.view.View>(R.id.unlock_error).visibility =
                    android.view.View.VISIBLE
            }
        }).authenticate(promptInfo)
    }
}
