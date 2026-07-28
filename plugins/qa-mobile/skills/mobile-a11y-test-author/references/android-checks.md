# Android accessibility test detail

Extends the core `AccessibilityChecks.enable()` example in
[../SKILL.md](../SKILL.md). Checks run automatically on any `ViewActions` action
and cover the acted-on view plus all descendant views ([atf][atf]).

## Add the dependency

```gradle
// app/build.gradle
dependencies {
    androidTestImplementation 'androidx.test.espresso:espresso-accessibility:3.6.1'
}
```

## Enable checks from the root view

```kotlin
import androidx.test.espresso.accessibility.AccessibilityChecks

@RunWith(AndroidJUnit4::class)
class CheckoutAccessibilityTest {
    init {
        AccessibilityChecks.enable().setRunChecksFromRootView(true)
    }

    @Test
    fun applyPromoCode() {
        onView(withId(R.id.promo_field)).perform(typeText("WELCOME10"), closeSoftKeyboard())
        onView(withId(R.id.apply_button)).perform(click())
        // checks fire automatically on every perform()
    }
}
```

`setRunChecksFromRootView(true)` evaluates the whole hierarchy, not just the
interacted view ([atf][atf]).

## Suppress known issues

```kotlin
AccessibilityChecks.enable().apply {
    setSuppressingResultMatcher(
        allOf(
            matchesCheck(TextContrastCheck::class.java),
            matchesViews(withId(R.id.decorative_watermark))
        )
    )
}
```

The matcher must satisfy both the check type and the specific view ([atf][atf]).

## Touch target size (48dp minimum)

Each interactive UI element should have a focusable area of at least 48dp x 48dp
([atgt][atgt]). `AccessibilityChecks` validates this on every `perform()` call.

## Contrast thresholds

`AccessibilityChecks` (via the Accessibility Test Framework) checks these on every
`perform()` call ([contrast][contrast]):

- Text smaller than 18sp, or bold text smaller than 14sp: minimum contrast ratio **4.5:1**.
- All other text: minimum contrast ratio **3:1**.

## contentDescription labelling

Convey purpose, not visual detail ([cd][cd]):

```kotlin
// Icon-only button: set contentDescription
Icon(
    imageVector = Icons.Filled.Share,
    contentDescription = stringResource(R.string.label_share)
)

// Decorative image: suppress from accessibility
Icon(
    imageVector = Icons.Filled.Decoration,
    contentDescription = null   // TalkBack skips this element
)
```

- `Text` composables need no `contentDescription`; TalkBack reads text content automatically.
- List items need distinct descriptions so a screen reader does not repeat the same label.

Verify with Espresso:

```kotlin
onView(withId(R.id.share_button))
    .check(matches(withContentDescription(R.string.label_share)))
```

## TalkBack manual workflow

Enable via Settings > Accessibility > TalkBack > On, then ([at][at]):

1. Linear navigation: swipe right/left through elements in order; double-tap to activate.
2. Explore by touch: drag to hear elements under your finger.

Manual checklist:

- All interactive elements are reachable via swipe.
- Each element announces its purpose clearly and without redundancy.
- Alert messages are announced when they appear.
- Focus traversal order matches the visual reading order.

## References

- [Espresso accessibility checking][atf] - `AccessibilityChecks.enable()`, `setRunChecksFromRootView(true)`, `setSuppressingResultMatcher()`, per-action firing.
- [Large controls][atgt] - 48dp x 48dp minimum touch target.
- [Text visibility][contrast] - 4.5:1 for text <18sp or bold <14sp; 3:1 for all other text.
- [Describe UI elements][cd] - `contentDescription`: purpose not visual detail, `null` for decorative, unique labels in lists.
- [Accessibility testing][at] - TalkBack enable, linear navigation, explore-by-touch, manual checklist.

[atf]: https://developer.android.com/training/testing/espresso/accessibility-checking
[atgt]: https://developer.android.com/guide/topics/ui/accessibility/apps#large-controls
[contrast]: https://developer.android.com/guide/topics/ui/accessibility/apps#text-visibility
[cd]: https://developer.android.com/guide/topics/ui/accessibility/apps#describe-ui-element
[at]: https://developer.android.com/guide/topics/ui/accessibility/testing
