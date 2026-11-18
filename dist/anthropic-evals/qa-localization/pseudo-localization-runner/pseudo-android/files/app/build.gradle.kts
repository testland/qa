android {
    namespace = "com.shop"
    buildTypes {
        getByName("debug") { applicationIdSuffix = ".debug" }
        getByName("release") { isMinifyEnabled = true }
    }
}
