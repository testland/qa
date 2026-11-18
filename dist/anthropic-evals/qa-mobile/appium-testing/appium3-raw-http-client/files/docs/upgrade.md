We upgraded the CI image to Appium 3 (and the latest UiAutomator2 driver).
The server no longer starts with our script, and smoke.py fails at every step after we
remove the flag by hand. We want to keep the script on plain HTTP (no client library).
