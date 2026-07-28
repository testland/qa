# Networked engine state and ownership tables - reference

Per-engine connection-state and authority-state enumerations for
multiplayer-state-machine-coverage Steps 1-2. The matrix is fixed by each
framework - you cannot add or remove states, only choose which to cover.

## Connection states

**Unity Netcode for GameObjects** (per
[the v2.11 manual](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.11/manual/index.html)):

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
[Networking Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine)):

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
[Mirror docs on NetworkBehaviour](https://mirror-networking.gitbook.io/docs/manual/components/networkbehaviour)):

| State | Trigger | Observability |
|---|---|---|
| `OnStartServer` | "called on server when a game object spawns on the server" | NetworkBehaviour override |
| `OnStartClient` | "called on clients when the game object spawns on the client" | NetworkBehaviour override |
| `OnStartLocalPlayer` | Local player only, after `OnStartClient` | NetworkBehaviour override |
| `OnStartAuthority` / `OnStopAuthority` | "Called when ownership changes" | NetworkBehaviour override |
| `OnStopServer` / `OnStopClient` | "Cleanup when objects are destroyed" | NetworkBehaviour override |

## Ownership / authority states

| Engine | Authority states |
|---|---|
| Unity NGO | `OwnerClientId` (per `NetworkObject`); `IsOwner`, `IsServer`, `IsHost` flags |
| Unreal | `ROLE_Authority` (server), `ROLE_AutonomousProxy` (owning client), `ROLE_SimulatedProxy` (other clients), `ROLE_None` |
| Mirror | `isServer`, `isClient`, `isLocalPlayer`, `isOwned` per [Mirror NetworkBehaviour docs](https://mirror-networking.gitbook.io/docs/manual/components/networkbehaviour) - `isOwned` "Returns true on the client if this client has authority over this game object" |
