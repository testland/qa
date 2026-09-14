# SessionTest, nightly job, since the two-emulator split

The runner distributes the four methods across the two emulators. Which methods
land on which device is decided per run.

| Date       | Device A ran | Device B ran | Failed |
|------------|--------------|--------------|--------|
| 2026-08-19 | a, c         | b, d         | d      |
| 2026-08-22 | a, b         | c, d         | -      |
| 2026-08-27 | c, a         | b, d         | a, d   |
| 2026-09-03 | b, d         | a, c         | d      |
| 2026-09-10 | c, d         | a, b         | -      |

Whole-class wall clock on the most recent green run (2026-09-10): 2 min 51 s
across the two devices.

## Single-method runs, Karim, 2026-09-11

Same build, same emulator image, one method per invocation, fresh emulator boot
before each:

```
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#a_promptsForNotificationsOnFirstLaunch PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#b_showsEmptyRecentSearches            PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#c_signsInAndRemembersMe               PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#d_showsRecentSearchesForSignedInUser  FAILED
```

Failure detail for `d_showsRecentSearchesForSignedInUser`, single-method run:

```
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found
matching: view.getId() is <2131231355/com.northwind.auth:id/search_field>
    View Hierarchy:
    +>DecorView{id=-1, visibility=VISIBLE}
    |
    +->LinearLayout{id=2131231300, res-name=sign_in_form, visibility=VISIBLE}
    |
    +-->EditText{id=2131231301, res-name=email_field, visibility=VISIBLE}
```

Failure detail for `b_showsEmptyRecentSearches`, nightly 2026-08-27 equivalent
ordering reproduced locally as d then b in one process:

```
java.lang.AssertionError: 'has child count: <0>' doesn't match the selected view.
  Expected: has child count: <0>
  Got: "LinearLayout{id=2131231402, res-name=recent_search_chips, child-count=3}"
```

Failure detail for `a_promptsForNotificationsOnFirstLaunch`, nightly 2026-08-27:

```
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found
matching: view.getId() is <2131231388/com.northwind.auth:id/notifications_rationale_card>
```
