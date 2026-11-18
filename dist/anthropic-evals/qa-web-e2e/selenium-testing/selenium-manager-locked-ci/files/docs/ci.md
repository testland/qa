- CI runners are behind the corporate proxy http://proxy.corp:3128 and have no internet access during the test
  stage (only the build stage can download). The browser itself must NOT use that proxy (it tests intranet apps).
- The runner image auto-updates Google Chrome; last week it moved to 131 and every job failed with
  "session not created: This version of ChromeDriver only supports Chrome version 128".
- QA signs off a release on one Chrome major version and wants tests on exactly that version (currently 131).
- Security: no usage data may leave the network.
- We're on Selenium 4.27.
