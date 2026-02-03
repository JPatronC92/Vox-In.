buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.11.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}

// plugins {
//     id("org.jlleitschuh.gradle.ktlint") version "12.1.0" apply false
// }

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    // apply(plugin = "org.jlleitschuh.gradle.ktlint")
}

tasks.register("clean").configure {
    delete("build")
}

