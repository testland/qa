# Make the cart test fast and reliable

## Problem Description

Fix `CartTest.kt` and the test setup so the test is fast and reliable (`notes.md`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/src/androidTest/java/com/example/shop/CartTest.kt ===============
package com.example.shop

import androidx.test.espresso.Espresso.onData
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CartTest {
    @get:Rule val rule = ActivityScenarioRule(ProductListActivity::class.java)

    @Test fun addTrailShoesToCart() {
        Thread.sleep(3000) // wait for the products API
        onData(withText("Trail Shoes")).perform(click())
        onView(withId(R.id.add_to_cart)).perform(click())
        Thread.sleep(1000) // snackbar animation
        onView(withText("Added to cart")).check(matches(isDisplayed()))
    }
}

=============== FILE: app/src/main/java/com/example/shop/ProductListActivity.kt ===============
class ProductListActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_product_list)
        val recycler = findViewById<RecyclerView>(R.id.products)   // 120 products, Trail Shoes is near the end
        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) { api.products() }   // Retrofit + OkHttp
            recycler.adapter = ProductAdapter(products) { open(it) }
        }
    }
}

=============== FILE: app/build.gradle.kts ===============
android {
    defaultConfig {
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
}
dependencies {
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}

=============== FILE: notes.md ===============
- onData fails with "No views in hierarchy found matching: is assignable from class: class android.widget.AdapterView".
- On CI emulators the sleeps are sometimes too short; locally they just waste time.
