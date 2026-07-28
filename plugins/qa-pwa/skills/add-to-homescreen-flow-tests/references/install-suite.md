# Install-suite coverage matrix

Full `tests/install-coverage.yaml` for the Add-to-Home-Screen suite. Every
matrix cell maps to a spec test plus the source criterion it verifies. CI gates
on every cell having a passing spec.

```yaml
# tests/install-coverage.yaml
matrix:
  stage_1_gate:
    - cell: manifest_link
      spec: install-gate.spec.ts > "manifest link present"
      source: install-criteria
    - cell: manifest_name
      spec: install-gate.spec.ts > "manifest declares name or short_name"
      source: install-criteria
    - cell: manifest_icons_192_512
      spec: install-gate.spec.ts > "manifest icons include 192px and 512px"
      source: install-criteria
    - cell: manifest_start_url
      spec: install-gate.spec.ts > "manifest start_url present"
      source: install-criteria
    - cell: manifest_display
      spec: install-gate.spec.ts > "manifest display is installable value"
      source: install-criteria
    - cell: prefer_related_applications_false
      spec: install-gate.spec.ts > "manifest does not opt out via prefer_related_applications"
      source: install-criteria
    - cell: https
      spec: install-gate.spec.ts > "site served over HTTPS"
      source: install-criteria
    - cell: service_worker_registered
      spec: install-gate.spec.ts > "service worker is registered (install prerequisite)"
      source: install-criteria
  stage_2_handshake:
    - cell: beforeinstallprompt_userChoice
      spec: install-prompt.spec.ts > "beforeinstallprompt: deferred prompt + click -> userChoice resolves"
      source: customize-install
    - cell: prompt_second_call_rejects
      spec: install-prompt.spec.ts > "beforeinstallprompt: second prompt() call rejects"
      source: customize-install "You can only call prompt() on the deferred event once"
  stage_2_appinstalled:
    - cell: appinstalled_fires
      spec: install-prompt.spec.ts > "appinstalled fires after install acceptance"
      source: customize-install
  stage_3_ios:
    - cell: apple_touch_icon_present
      spec: install-ios.spec.ts > "iOS install metadata: apple-touch-icon present"
      source: learn-pwa
    - cell: apple_mobile_web_app_capable
      spec: install-ios.spec.ts > "iOS install metadata: apple-mobile-web-app-capable yes"
      source: learn-pwa
    - cell: apple_touch_icon_resolves
      spec: install-ios.spec.ts > "iOS install metadata: apple-touch-icon resolves"
      source: learn-pwa
  stage_4_runtime:
    - cell: display_mode_standalone
      spec: install-display-mode.spec.ts > "display-mode: standalone in launched-as-app context"
      source: pwa-install-flow-reference Stage 4
    - cell: install_button_hidden_when_standalone
      spec: install-display-mode.spec.ts > "display-mode: hides Install button when standalone"
      source: pwa-install-flow-reference Stage 4
```

Source references:

- install-criteria: https://web.dev/articles/install-criteria
- customize-install: https://web.dev/articles/customize-install
- learn-pwa: https://web.dev/learn/pwa/installation
