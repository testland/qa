# Fixture-to-cert-clause mapping - reference

Map every fixture to the specific cert clause it covers, for
multiplayer-state-machine-coverage Step 6. Examples from the
[Xbox Requirements page](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements):

| Test fixture | Xbox XR covered |
|---|---|
| Client gracefully disconnects on Xbox network loss | XR-074: "Titles must gracefully handle errors with Xbox and partner services connectivity." |
| MPSD session state retains member list across host migration | XR-067: "titles with online multiplayer functionality must maintain session-state information on the Xbox network … through the Xbox Multiplayer Session Directory (MPSD)" |
| Joining via Xbox shell launches into multiplayer session | XR-064: "titles that offer joinable game sessions must enable joinability through the Xbox shell interface" |
| Privilege check before joining MP session | XR-045: `XPRIVILEGE_MULTIPLAYER_SESSIONS` (ID 254) per the [XR-045 privilege table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Player communication respects privacy settings | XR-015: `CommunicateUsingText` / `CommunicateUsingVoice` privilege checks per the [XR-015 permissions table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Save roams across console types within a generation | XR-130: "Ensure that saved games work across console types within the generation" |
| Cross-network play visual identification | XR-007: "Titles must visually identify Xbox network users when they're playing with players from non-Xbox gaming networks" |
| Controller disconnect mid-multiplayer | XR-115: re-establish active controller; see [XR-115](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |

For Sony TRC and Nintendo Lotcheck, the analogous clauses are NDA - cite by
stable ID per `platform-cert-overview-reference` and tag the fixture with the
partner-portal clause number.
