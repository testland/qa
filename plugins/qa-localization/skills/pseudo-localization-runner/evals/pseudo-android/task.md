# Set up pseudo-localization for the Android debug build

## Problem Description

Set up pseudo-localization for our Android app's debug build and list what it would expose in this code (`app/`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/build.gradle.kts ===============
android {
    namespace = "com.shop"
    buildTypes {
        getByName("debug") { applicationIdSuffix = ".debug" }
        getByName("release") { isMinifyEnabled = true }
    }
}

=============== FILE: app/src/main/res/layout/cart_row.xml ===============
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent" android:layout_height="48dp" android:orientation="horizontal">
    <TextView android:id="@+id/name" android:layout_width="160dp" android:layout_height="wrap_content"
        android:layout_marginLeft="16dp" android:gravity="left" android:maxLines="1" />
    <Button android:id="@+id/remove" android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="Remove" android:paddingRight="8dp" />
</LinearLayout>

=============== FILE: app/src/main/res/values/strings.xml ===============
<resources>
    <string name="app_name">Shop</string>
    <string name="checkout" translatable="false">Checkout</string>
</resources>

=============== FILE: app/src/main/java/com/shop/CartActivity.kt ===============
title = "$count items in your cart"

=============== FILE: app/src/main/AndroidManifest.xml ===============
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name" />
</manifest>
