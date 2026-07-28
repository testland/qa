# Sony TRC and Nintendo Lotcheck - reference

Full detail for the two NDA-gated console regimes, for
platform-cert-overview-reference.

**NDA note (applies to every clause below).** All Sony TRC and Nintendo
Lotcheck specifics are behind gated portals - PlayStation DevNet and the
Nintendo Developer Portal. They are cited by stable ID ("Sony TRC" /
"Nintendo Lotcheck") per `PLUGIN_AUTHORING.md` Step 4 fallback; partners with
portal access should consult the current authoritative revision. Individual
clauses are not re-marked NDA in the sections below.

## Sony PlayStation Certification (TRC)

### Source of truth

- **Document:** Sony **Technical Requirements Checklist (TRC)** - gated NDA
  portal at PlayStation DevNet.
- **Per-generation supplements:** PS5 TRC supersedes PS4 TRC; PS5 Pro adds
  60-Hz / 8K / PS5 Pro Game Boost guidance.

### Structure

The Sony TRC is a numbered checklist organised into roughly comparable buckets
to the Xbox XR list:

- **Functional** - title stability, error recovery, save game.
- **Trophies** - Sony's analogue to Xbox Achievements (exact count / point
  limits by stable ID).
- **Multiplayer** - session lifecycle, presence, voice + text chat.
- **PSN integration** - sign-in, friends, party.
- **Content delivery** - DLC, patches, packaging.
- **Compatibility** - generation matrix (PS4 base / PS4 Pro / PS5 / PS5 Pro),
  Game Boost, backward compatibility.
- **Hardware peripherals** - DualSense haptics, adaptive triggers, PSVR2
  (where applicable).

### Submission workflow

Sony documents its high-level publishing workflow publicly via
[playstation.com/en-us/develop](https://www.playstation.com/en-us/develop/);
the per-step TRC details are NDA.

1. **QA pre-cert** - partner runs internal TRC dry pass.
2. **Submission upload** - Master to Sony's submission system.
3. **Format QA** - Sony's QA team validates the build against the TRC.
4. **Pass / Fail decision** - fail tickets list each TRC clause violated.
5. **Re-submit** - corrected master goes back through the same workflow.

### Severity vocabulary

Sony classifies findings on a severity scale comparable to the Microsoft
CFR / SRI split. Each finding lists the TRC clause it violates and the steps
to reproduce.

### SLAs

Sony does not publish SLAs publicly. Practitioners budget calendar-weeks for a
console-game format QA pass; patch / minor-update SLAs are shorter than
initial-release SLAs.

## Nintendo Lotcheck

### Source of truth

- **Document:** Nintendo **Submission Guidelines** ("Lotcheck") - gated
  Nintendo Developer Portal.
- **Public-facing partner portal:** [developer.nintendo.com](https://developer.nintendo.com/)
  (the developer landing page is reachable without NDA but shows only general
  program info; the Lotcheck document itself requires developer-portal access).

### Structure

Nintendo Lotcheck covers analogous buckets:

- **Functional and stability** - boot, save, error recovery.
- **Network play and online services** - Nintendo Network authentication,
  online matchmaking, friend lists, parental controls.
- **Profile and user data** - Nintendo Account, Mii, save data.
- **Storage** - microSD / system memory boundaries, save data cloud sync where
  applicable.
- **Compatibility** - across Switch hardware revisions (original / Lite / OLED)
  and Switch 2 where supported, **docked vs. handheld mode** transitions,
  joy-con + Pro Controller + detached + paired modes.
- **Performance** - sustained framerate in handheld vs. docked, thermal
  behaviour during long sessions.
- **eShop metadata + ratings** - region-specific (Japan / Americas / Europe /
  Australia / Korea).

### Workflow

The Lotcheck submission workflow is comparable in shape to Sony TRC: pre-cert
dry-run, master upload, Nintendo QA pass, fail ticket list keyed to Lotcheck
clauses, re-submission. Exact step names and SLAs are NDA.

### Notable distinguishing constraints

- **Handheld / docked transitions** are a Switch-specific test surface with no
  analogue on Xbox / PlayStation.
- **Cartridge + eShop dual delivery** complicates patch / DLC layout.
- **Joy-Con drift / detached / single-Joy-Con modes** add a controller-state
  matrix beyond the Xbox / PS controller test surface.
