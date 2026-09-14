# Where I got to - Bilal, 2026-09-11

**Request 5.** Nearly there. `onView(withText("NW-10042")).check(matches(isDisplayed()))`
throws `NoMatchingViewException` and the hierarchy dump only has nine rows in it,
which confused me for a whole morning because the account definitely has four
hundred. I tried asserting on the row id instead and got the same thing. The
account is seeded and NW-10042 is at position 213.

**Request 2.** I can see the message on the device and I have a screenshot the
harness captured at the moment of failure with the message clearly on it, and
`onView(withText("Saved to your wishlist"))` still throws `NoMatchingViewException`
at that exact moment. The hierarchy dump attached to the failure lists the
product screen's views and nothing else. I do not understand how both of those
can be true.

**Request 3.** I can make the sync fail and I can see the failure screen come up
on the emulator. Every matcher I write against it throws. The hierarchy dump has
the shop's own views in it and none of the ones I can see on screen. Logcat at
the moment of the failure:

    09-11 14:02:51.440 I/ActivityManager: Displayed com.northwind.shop/.SyncErrorActivity
    09-11 14:02:51.441 D/Northwind: sync worker reporting, pid=5120, name=com.northwind.shop:sync
    09-11 14:02:51.502 D/Northwind: shop ui alive, pid=5104, name=com.northwind.shop

**Requests 1 and 4.** Both of these take me off our screens. On 1 I get the
phone's settings app and nothing I write matches anything on it. On 4 I get the
picker and the same thing happens. The dumps in both cases have nothing from
`com.northwind.shop` in them at all.
