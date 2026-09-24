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
