---
name: multiplayer-state-machine-coverage
description: "Build a coverage matrix for a networked-game state machine that exercises connect / authority-handoff / disconnect / reconnect / host-migration paths across Unity Netcode for GameObjects, Unreal Engine replication, and Mirror Networking. Workflow: enumerate the engine's connection states + ownership states + replicated-property update rules, cross them against latency / loss / out-of-order packet injection, encode each combination as a test fixture, and emit a go / no-go gate. Use before submitting a multiplayer title to platform cert - Microsoft's cert guide lists 'Multiplayer does not work as expected' as one of the most common Hold reasons, and Xbox XR-067 (MPSD session state) is failed by uncovered state-machine paths."
metadata:
  keywords: "multiplayer, netcode, unity-ngo, unreal-replication, mirror-networking, state-machine, host-migration, reconnect, xr-067"
---

# multiplayer-state-machine-coverage

## Overview

Networked games are state machines: each player connection, each
replicated entity, and each authority handoff transitions through
a documented set of states. Cert failures and on-the-wire bugs
overwhelmingly happen at **transition edges** - connect, host
migration, disconnect-mid-action, reconnect-after-network-loss - 
not in the steady-state gameplay loop.

This skill is a **build-an-X workflow**: produce a **state-machine
coverage matrix** that enumerates every connection + ownership +
replication state in your engine, crosses it with the network
fault matrix (latency / loss / out-of-order / disconnect), and
emits a fixture list + a go / no-go gate.

Composes with:

- [`game-test-categories-reference`](../game-test-categories-reference/SKILL.md) - multiplayer testing is a cross-axis over functional /
  compliance / compatibility / performance.
- [`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md) - the matrix maps onto Xbox **XR-067 (MPSD session state)**,
  **XR-064 (joinable sessions)**, **XR-115 (controller / user
  add and remove)**, and **XR-074 (loss of connectivity)**, all
  cited inline below from the
  [Xbox Requirements page](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements).
- [`unity-test-framework`](../unity-test-framework/SKILL.md),
  [`unreal-automation-system`](../unreal-automation-system/SKILL.md),
  [`godot-gut-tests`](../godot-gut-tests/SKILL.md) - the per-engine
  test frameworks the fixtures run in.

## When to use

- Building the multiplayer test plan for a title that ships to
  Xbox / PlayStation / Switch - cert pass risk concentrates here.
- Triaging a recurring "host migration drops players" / "join
  fails after suspend" / "save corrupted on rejoin" bug class.
- Bringing up netcode-driven gameplay (Unity NGO, Unreal
  replication, Mirror) for the first time on a project - set the
  coverage floor before launch.

Microsoft's
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
explicitly cites "Multiplayer does not work as expected" as one
of the three most common reasons titles are placed on **Hold**.
Holds are calendar-week delays - coverage authored ahead of cert
is the cheapest mitigation.

## Inputs

Before walking the workflow, gather:

| Input | Where | Why |
|---|---|---|
| Engine + netcode stack | Project - Unity NGO / Unreal replication / Mirror | Determines the state vocabulary you enumerate |
| Topology - host / dedicated / listen | Game design doc | Listen-server has different states than dedicated server (see Unreal section below) |
| Max concurrent players (`MaxPlayers`) | Backend config / multiplayer service | Caps the fixture matrix |
| Persistence model - does the session resume after host-migration / suspend? | Game design + platform cert requirements | XR-067 requires the title maintain MPSD session state |
| Platform target - Xbox / PSN / Switch / Steam | Cert plan | Drives the XR / TRC / Lotcheck clauses to cover |

## Workflow

### Step 1 - Enumerate connection states

Per engine docs, list the states **the engine exposes**. The
matrix is fixed by the framework - you cannot add or remove
states, only choose which to cover.

**Unity Netcode for GameObjects** (per
[the v2.11 manual](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.11/manual/index.html) - NGO "is a high-level networking library built for Unity for
you to abstract networking logic" with "Mono and IL2CPP" support
and host / server / client topologies):

| State | Trigger | Observability |
|---|---|---|
| `Disconnected` | Initial / after disconnect | `NetworkManager.IsConnectedClient == false` |
| `Connecting` | `NetworkManager.StartClient()` invoked | Between request and approval |
| `Connected (Approved)` | Server accepts client | `OnClientConnectedCallback` |
| `Connected (Pending Spawn)` | Approved but player object not yet spawned | Wait for `OnNetworkSpawn` |
| `Connected (Spawned)` | `NetworkObject.IsSpawned == true` | Gameplay-ready |
| `Disconnecting` | `Shutdown()` / link loss | `OnClientDisconnectCallback` fires next |
| `Host` | Same process is both server + client | `NetworkManager.IsHost` |

**Unreal Engine replication** (per the
[Networking Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine):
"The server, as the host of the game, holds the one, true,
authoritative game state."):

| State | Trigger | Observability |
|---|---|---|
| `NM_Standalone` | Single-player | `World->GetNetMode()` |
| `NM_DedicatedServer` | "Separate machine with no local players" | `IsRunningDedicatedServer()` |
| `NM_ListenServer` | "Host machine where the server operator also plays locally" | `IsRunningListenServer()` |
| `NM_Client` | Connected as remote client | `World->IsClient()` |
| `Login` | `AGameModeBase::PreLogin` → `Login` → `PostLogin` | Override `PostLogin` |
| `Travel` (seamless / hard) | `ServerTravel` to new map | `PlayerController->bIsClientReplicationPausedForFrame` |
| `Logout` | `Logout()` callback | Override on `GameModeBase` |

**Mirror Networking** (per the
[Mirror docs on NetworkBehaviour](https://mirror-networking.gitbook.io/docs/manual/components/networkbehaviour),
"a high level Networking library for Unity, optimized for ease
of use & probability of success"):

| State | Trigger | Observability |
|---|---|---|
| `OnStartServer` | "called on server when a game object spawns on the server" | NetworkBehaviour override |
| `OnStartClient` | "called on clients when the game object spawns on the client" | NetworkBehaviour override |
| `OnStartLocalPlayer` | Local player only, after `OnStartClient` | NetworkBehaviour override |
| `OnStartAuthority` / `OnStopAuthority` | "Called when ownership changes" | NetworkBehaviour override |
| `OnStopServer` / `OnStopClient` | "Cleanup when objects are destroyed" | NetworkBehaviour override |

### Step 2 - Enumerate ownership states

Authority handoff is where most "ghost item" / "ability use after
death" bugs live. Per the engine docs:

| Engine | Authority states |
|---|---|
| Unity NGO | `OwnerClientId` (per `NetworkObject`); `IsOwner`, `IsServer`, `IsHost` flags |
| Unreal | `ROLE_Authority` (server), `ROLE_AutonomousProxy` (owning client), `ROLE_SimulatedProxy` (other clients), `ROLE_None` |
| Mirror | `isServer`, `isClient`, `isLocalPlayer`, `isOwned` per [Mirror NetworkBehaviour docs](https://mirror-networking.gitbook.io/docs/manual/components/networkbehaviour) - "isOwned - client has authority over this object" |

Authority transitions to cover:

- **Spawn → owner assignment** - does the right `OnStartAuthority`
  / `OnGainedOwnership` callback fire?
- **Authority handoff mid-action** - player picks up an item that
  another player owns; does the prior owner stop sending RPCs?
- **Authority loss on disconnect** - does authority return to
  server or transfer to another client?
- **Authority on host migration** - see Step 4 below.

### Step 3 - Enumerate replicated-property transitions

For every replicated property (NGO `NetworkVariable<T>`, Unreal
`UPROPERTY(Replicated)` / `RepNotify`, Mirror `[SyncVar]`),
identify:

1. **The set of legal values** it can hold.
2. **The set of legal transitions** between values (some pairs
   should never be observed).
3. **The callback fired on remote** when it changes (Unreal:
   `OnRep_<PropName>` per
   [Networking Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine):
   "Replicated Using Properties: State that triggers a callback
   function upon replication"; Mirror: `[SyncVar(hook=...)]`; NGO:
   `NetworkVariable<T>.OnValueChanged`).

Each `OnRep_` / hook handler is a transition edge that needs at
least one fixture exercising it.

### Step 4 - Cross with the network fault matrix

The engine state machines are deterministic on a perfect
network. Real networks are not perfect. Cross-product each
state from Step 1 with:

| Fault | How to inject |
|---|---|
| Latency 50 / 200 / 500 ms | OS-level traffic shaper (`tc qdisc add dev eth0 root netem delay 200ms`); Unity Multiplayer Tools' Network Simulator; Mirror's `LatencySimulation` component |
| Packet loss 1 / 5 / 20 % | `tc qdisc … loss 5 %`; engine-specific simulator |
| Reordering | `tc qdisc … delay 50ms reorder 25 %` |
| Connection drop | Detach NIC / kill UDP socket / engine-specific `Disconnect()` |
| Host suspend (console only) | Platform-specific suspend → resume |
| Host migration (where supported) | Force-quit host; verify new host election |

The full Cartesian product is too big - sample by **risk-weighted
buckets**:

- **High** - every fault × every transition edge.
- **Medium** - steady-state gameplay × every fault.
- **Low** - steady-state gameplay × baseline (no fault).

### Step 5 - Encode each combination as a fixture

For Unity NGO, the fixture is a UTF `[UnityTest]` PlayMode test
(see [`unity-test-framework`](../unity-test-framework/SKILL.md)):

```csharp
[UnityTest]
public IEnumerator HostMigration_TransfersAuthority_OnHostDisconnect()
{
    // Arrange - host + 2 clients
    var host = StartHost();
    yield return new WaitForSeconds(1f);
    var c1 = StartClient(); yield return new WaitForSeconds(0.5f);
    var c2 = StartClient(); yield return new WaitForSeconds(0.5f);

    // Spawn an authority-bearing object owned by host
    var npc = host.SpawnNpc();
    yield return new WaitForSeconds(0.5f);
    Assert.AreEqual(host.LocalClientId, npc.OwnerClientId);

    // Act - kill the host
    host.Shutdown();

    // Assert - surviving client becomes new host within
    // <= 5 s and reassigns NPC authority.
    yield return new WaitForSeconds(5f);
    Assert.IsTrue(c1.IsHost || c2.IsHost);
    Assert.IsNotNull(NetworkManager.Singleton.SpawnManager.SpawnedObjects[npc.NetworkObjectId]);
}
```

For Unreal, a
[`unreal-automation-system`](../unreal-automation-system/SKILL.md)
spec wrapping `IAutomationDriverModule` doesn't drive netcode
directly - instead, drive a multi-process test harness (UE 5.x's
"Multi-User Editor" / Multi-Process PIE) and use specs to
**observe** the resulting `OnRep_` invocations.

For Mirror, the fixture is a Unity NGO-style UTF test plus
Mirror's built-in network simulation transports.

### Step 6 - Wire to platform-cert clauses

Map every fixture to a specific cert clause it covers. Examples
from the
[Xbox Requirements page](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements):

| Test fixture | Xbox XR covered |
|---|---|
| Client gracefully disconnects on Xbox network loss | XR-074: "Titles must gracefully handle errors with Xbox and partner services connectivity." |
| MPSD session state retains member list across host migration | XR-067: "titles with online multiplayer functionality must maintain session-state information on the Xbox network … through the Xbox Multiplayer Session Directory (MPSD)" |
| Joining via Xbox shell launches into multiplayer session | XR-064: "titles that offer joinable game sessions must enable joinability through the Xbox shell interface" |
| Privilege check before joining MP session | XR-045: `XPRIVILEGE_MULTIPLAYER_SESSIONS` (ID 254) per the [XR-045 privilege table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Player communication respects privacy settings | XR-015: `CommunicateUsingText` / `CommunicateUsingVoice` privilege checks per the [XR-015 permissions table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Save roams across console types within a generation | XR-130: "Ensure that saved games work across console types within the generation" |
| Cross-network play visual identification | XR-007: "Games must visually identify Xbox network users when playing with off-network players" |
| Controller disconnect mid-multiplayer | XR-115: re-establish active controller; see [XR-115](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |

For Sony TRC and Nintendo Lotcheck, the analogous clauses are
NDA - cite by stable ID per
[`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
and tag the fixture with the partner-portal clause number.

### Step 7 - Emit the go / no-go gate

Aggregate the matrix into a coverage report:

```
Multiplayer state-machine coverage - MyGame v1.4.2
====================================================
Connection states enumerated:          7 / 7 ✓
Ownership transitions enumerated:      5 / 5 ✓
Replicated-property edges enumerated: 23 / 23 ✓
Fault-matrix coverage:
  High-risk bucket:  18 / 18 fixtures ✓
  Medium bucket:      9 / 12 fixtures (75 %) ⚠
  Low bucket:         3 /  4 fixtures (75 %)
Cert-clause coverage:
  XR-067 MPSD session state              ✓
  XR-074 Service connectivity loss        ✓
  XR-064 Joinable via shell               ✓
  XR-045 Privilege checks                 ✓
  XR-015 Comm-privacy                     ⚠ (CommunicateUsingVoice path uncovered)
  XR-115 Controller add/remove mid-MP     ✓
  XR-130 Save roams across SKUs           ✓

VERDICT: NO-GO (XR-015 voice-privacy path uncovered;
              medium-risk bucket below 80 % threshold)
```

The gate refuses to advance to platform-cert submission until
every cert-mapped clause is covered and the high-risk bucket is
at 100 %.

## Worked example - Unity NGO host migration

Inputs:

- **Engine + netcode:** Unity 6.0, Netcode for GameObjects v2.11.
- **Topology:** Host (one client doubles as server).
- **Max players:** 8.
- **Persistence:** Session must survive host migration; saves
  per-client.
- **Platform target:** Xbox + PSN + Switch + Steam.

Step 1 - connection states from the
[NGO v2.11 manual](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.11/manual/index.html):
`Disconnected`, `Connecting`, `Connected (Approved)`,
`Connected (Pending Spawn)`, `Connected (Spawned)`,
`Disconnecting`, `Host`.

Step 2 - ownership transitions: spawn → owner assigned; host
quits → ownership re-elected; client picks up host-owned item.

Step 3 - replicated properties under coverage: `currentHealth`
(`NetworkVariable<float>`), `inventoryHash` (`NetworkVariable<int>`),
`questFlags` (`NetworkVariable<NetworkSerializableQuestState>`).

Step 4 - fault matrix selection: high-risk = `Host` → `Connected`
(other client takes over) under each of {200 ms latency, 5 %
loss, host-kill, host-suspend (Xbox)}.

Step 5 - encode each combination as a UTF PlayMode `[UnityTest]`
(see code sample in Step 5 above).

Step 6 - map fixtures to cert clauses (per the
[XR list](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)):

- Host-kill + reconvene → **XR-067** (MPSD session retained).
- Host-suspend on Xbox → **XR-074** (graceful service loss).
- New host accepts joins via shell → **XR-064**.
- Voice chat after host migration respects mute → **XR-015**.

Step 7 - emit gate. Failing fixture: voice mute is reapplied
after host migration only 4 / 5 runs (flake). Verdict: NO-GO,
flake on the XR-015 voice path; needs a deterministic
re-application path before cert.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Testing only the happy path | Cert findings concentrate on transition edges | Cover every state × fault combination in the high-risk bucket |
| LAN-only multiplayer testing | Submission fails under WAN latency / loss | Inject latency + loss with `tc qdisc` or engine simulator |
| No host-migration coverage on titles that claim to support it | XR-067 fails mid-session | At least one fixture per supported migration path |
| Ignoring `IsOwned` / authority flags in tests | False positives (test passes because client mirrors authority anyway) | Per [Mirror docs](https://mirror-networking.gitbook.io/docs/manual/components/networkbehaviour), assert `isOwned` / `IsOwner` explicitly |
| Replication-property hook coverage by inspection only | `OnRep_` doesn't fire if value unchanged - silent contracts | Tests that explicitly mutate the property and assert the hook ran |
| Coverage matrix only on engine states, not cert clauses | Passes internal QA, fails cert | Step 6 mapping is mandatory |
| Trusting "host migration works" without a deterministic election test | Election timing is racy | Bound the election window (e.g., new host elected within 5 s) and assert on it |
| Using `[ClientRpc]` for all communication | Bandwidth hog; non-reliable RPCs preferred for frequent calls per [Networking Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine) | Replicated properties for state; RPCs only for events |
| Voice chat covered only with text chat | Per [XR-015 permission table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements), `CommunicateUsingText` and `CommunicateUsingVoice` are separate privileges | Test both paths independently |

## Limitations

- **Multi-process test harnesses are flaky on CI.** Spinning up
  multiple game instances (host + clients) in a single CI job
  often hits port-collision or timing-dependent flake. Run
  multiplayer fixtures on a dedicated multi-VM tier, not the same
  CI runner as unit tests.
- **Engine-specific simulators differ.** Unity's Network Simulator
  is config-driven; Mirror exposes a `LatencySimulation`
  component; Unreal uses `Net PktLag` / `Net PktLoss` console
  commands. The matrix must use whichever the engine ships - no
  generic abstraction works across all three.
- **Cert clauses change.** XR identifiers churn release-to-release
  (the
  [XR v16.1 May 2026 release notes](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  retired XR-134) - re-verify the mapping in Step 6 against the
  current XR document.
- **NDA-only platform clauses.** Sony TRC / Nintendo Lotcheck
  exact multiplayer clauses are NDA - cite by stable ID and tag
  fixtures with portal clause numbers.
- **State-machine enumeration is engine-version-coupled.** A NGO
  update may add states (e.g., a "Reconnecting" intermediate);
  re-enumerate when bumping the package version.
- **Coverage matrix does not catch desync bugs by itself.** It
  exercises *transitions*; for desync detection between authority
  and remote-mirrored state, add property-equality assertions
  inside fixtures (especially on the `OnRep_` / hook paths).
