plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.acme.shop"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.acme.shop"
        minSdk = 26
        targetSdk = 35
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
