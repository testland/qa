Notes before I go - sorry this isn't finished.

Server installs fine and starts fine (`appium` prints the banner, port 4723).
Wrote a throwaway session request to check it worked and got:

    [Appium] Could not find a driver for automationName 'UiAutomator2' and
    [Appium] platformName 'Android'. Please check your desired capabilities.

Tried the same thing on Sam's MacBook against the simulator, same shape:

    [Appium] Could not find a driver for automationName 'XCUITest' and
    [Appium] platformName 'iOS'. Please check your desired capabilities.

Setup script still exits 0 in that state which feels wrong.

The app under test: package `com.acme.shop`, launch activity `.MainActivity`,
debug build lands at `./build/app-debug.apk`. iOS bundle id is `com.acme.shop`
and the simulator build lands at `./build/Shop.app`. The app already ships
accessibility identifiers on the login screen: `email-field`, `password-field`,
`sign-in`, `account-home`.
