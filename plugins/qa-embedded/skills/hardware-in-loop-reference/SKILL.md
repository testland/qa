---
name: hardware-in-loop-reference
description: "Pure-reference catalog of hardware-in-the-loop (HIL) testing for embedded systems. Defines the HIL pattern (ECU-under-test + real-time plant simulator + I/O cards emulating sensors / actuators / buses), the V-cycle progression (MIL → SIL → PIL → HIL), the canonical vendor stack (NI VeriStand + PXI / CompactRIO, dSPACE SCALEXIO / MicroAutoBox, Vector CANoe + VT System, Speedgoat real-time targets), bus emulation per protocol (CAN / CAN FD / LIN / FlexRay / Automotive Ethernet / SOME-IP), fault-injection patterns (short-to-ground, open-circuit, signal corruption), DO-178C / ISO 26262 / IEC 61508 alignment, and the test-evidence chain HIL produces. Use as the HIL terminology + vendor + standard reference when scoping an embedded test rig or interpreting an automotive / aerospace / industrial HIL test report."
rating: 23
d6: 4
keywords: ["hil", "hardware-in-loop", "embedded", "automotive", "ecu", "iso-26262", "do-178c", "canoe", "veristand"]
---

# hardware-in-loop-reference

## Overview

Hardware-in-the-loop (HIL) is, per
[en.wikipedia.org/wiki/Hardware-in-the-loop_simulation](https://en.wikipedia.org/wiki/Hardware-in-the-loop_simulation),
"a technique that is used in the development and testing of
complex real-time embedded systems" that "provides an effective
testing platform by adding the complexity of the process-actuator
system, known as a plant, to the test platform". In practice it
means: the production ECU runs production firmware against a
real-time simulator that emulates the rest of the vehicle / aircraft
/ machine in closed loop, with the same electrical interfaces the
ECU sees in the field.

This skill is a **pure reference** consumed by the per-tool
skills ([`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md),
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md),
[`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md))
when teams need to decide what slips into HIL versus what stays in
host / QEMU.

## When to use

- Scoping a new HIL rig - what hardware, what protocols, what level
  of plant fidelity.
- Reading an HIL test report from a vendor (NI / dSPACE / Vector /
  Speedgoat) and translating their proprietary terms.
- Negotiating the V-model split (MIL / SIL / PIL / HIL) with safety
  engineering.
- Pairing HIL coverage with structural coverage from
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md).
- Specifying fault-injection scenarios for a safety case.

## The HIL pattern

```
+-------------------+         analog/digital I/O      +-------------------+
|                   | <----------------------------- |                   |
|  Real-time        |   CAN / CAN-FD / LIN / FlexRay |  ECU under test   |
|  plant simulator  | <----------------------------- |  (production       |
|  (vehicle / motor |                                |  firmware,         |
|  / battery model) | -----------------------------> |  production HW)    |
|                   |   wheel speed, temp, voltage,  |                   |
+-------------------+   pedal position, error codes  +-------------------+
        |
        | fault injection: short-to-ground / open / corrupt-bus / drift
        v
   Test sequencer + scenario scripts
```

Per Wikipedia (citation above), the rig "must include electrical
emulation of sensors and actuators" - that emulation is what
distinguishes HIL from pure software simulation. The ECU sees
voltage / current / bus traffic, not numbers in RAM.

## V-cycle: MIL → SIL → PIL → HIL

| Stage | Plant | Controller | Where it runs |
|---|---|---|---|
| **MIL** (Model-in-the-loop) | Simulink model | Simulink model | Host PC, Simulink simulation |
| **SIL** (Software-in-the-loop) | Simulink model | C/C++ auto-generated from controller model | Host PC, native compile |
| **PIL** (Processor-in-the-loop) | Simulink model on host | C/C++ cross-compiled, running on the *production processor* | Eval board + host |
| **HIL** (Hardware-in-the-loop) | Real-time plant model on real-time target | Production firmware on production ECU | Production hardware + real-time simulator |

(The terms MIL / SIL / PIL / HIL are not in Wikipedia's HIL article
but are universal in automotive ECU verification - cite by stable
term "automotive V-model verification stages".) Each stage tightens
the realism by replacing one block with the real artefact. HIL is
the last gate before SOP (Start Of Production) sign-off.

## Vendor stack at a glance

Vendor product pages are largely gated (Cloudflare / login walls);
cited by stable ID.

| Vendor | Real-time target | Test authoring | Notable strength |
|---|---|---|---|
| **NI** | PXI chassis + R-Series FPGA / CompactRIO | **VeriStand** (System Definition `.nivssdf`, stimulus profiles, real-time sequence) + TestStand orchestrator | Strong on FPGA-precision I/O; tight Simulink import. Cite "NI VeriStand 2024 System Definition File Reference" |
| **dSPACE** | SCALEXIO / MicroAutoBox | **ControlDesk** + **AutomationDesk** | De-facto in automotive Tier 1s; AUTOSAR-aware. Cite "dSPACE SCALEXIO 2024 / ControlDesk 2024 Help" |
| **Vector** | VT System (rack) + VT instrument cards | **CANoe** with CAPL test scripting + vTESTstudio test authoring | Bus-traffic-centric (CAN / CAN-FD / LIN / FlexRay / Ethernet / SOME-IP). Cite "Vector CANoe 17 User Manual" |
| **Speedgoat** | Performance / Mobile / Baseline real-time targets | **Simulink Real-Time** test harnesses | Tight MathWorks integration; xPC-Target descendant |
| **OPAL-RT** | OP4510 / OP5707 | **RT-LAB** + **eMEGAsim** | Power electronics / grid; sub-microsecond loops |

The reader should treat vendor choice as a procurement decision,
not a technical one - all the vendors support the core HIL pattern.
Vendor differentiation is in I/O density, FPGA latency, and which
test-authoring language the team has skill in (CAPL for Vector,
LabVIEW for NI, Simulink for Speedgoat).

## Bus emulation per protocol

| Protocol | Speed | Topology | HIL-relevant notes |
|---|---|---|---|
| **CAN classical (ISO 11898-1)** | 1 Mbit/s | Multi-master bus | Standard ECU bus; nearly all rigs include a CAN card. Cite "ISO 11898-1:2015" |
| **CAN FD** | 5 Mbit/s data phase | Multi-master | Higher payload (64 B vs 8 B); rigs need CAN FD-capable transceiver |
| **LIN (ISO 17987)** | 19.2 kbit/s | Single master / multi-slave | Body electronics (door, mirror). Cite "ISO 17987-1:2016" |
| **FlexRay** | 10 Mbit/s | Dual-channel, TDMA | Chassis / X-by-wire on premium platforms. Cite "ISO 17458-1:2013" |
| **Automotive Ethernet (100BASE-T1 / 1000BASE-T1)** | 100 Mbit/s or 1 Gbit/s | Point-to-point | ADAS / infotainment backbone. Cite "IEEE 802.3bw-2015" (100BASE-T1) and "IEEE 802.3bp-2016" (1000BASE-T1) |
| **SOME-IP / SOME-IP-SD** | App-layer over UDP/TCP on Automotive Ethernet | Service-oriented | Service discovery + RPC; AUTOSAR Adaptive. Cite "AUTOSAR FO R23-11 SOME-IP Protocol Specification" |
| **CXPI** | 20 kbit/s | Single-wire | LIN replacement on JP OEMs |

Vector's CANoe is the de-facto authoring tool for the first five
rows; NI VeriStand and dSPACE wrap their own driver stacks.

## Fault-injection patterns

The reason HIL exists. Sw-only sims can't reproduce these:

| Pattern | What it does | Detects |
|---|---|---|
| **Short-to-ground** | Sensor wire shorted to chassis | Open-circuit detection logic, watchdog |
| **Short-to-battery** | Sensor wire shorted to V_bat | Over-voltage protection, fuse logic |
| **Open-circuit** | Sensor disconnected | Plausibility checks, neighbour-signal sanity |
| **Signal corruption** | Bit-flip on CAN frame, CRC error | CAN error counter handling, retry policy |
| **Bus-off** | Excessive errors trigger CAN bus-off state | Bus-off recovery state machine |
| **Drift / bias** | Sensor reading slowly offsets | Long-term sensor diagnostics, OBD-II logic |
| **Frozen signal** | Same value forever | Signal-staleness watchdog |
| **Latency injection** | Bus delay added | Real-time deadline handling |
| **Power glitch** | V_bat dips below threshold momentarily | Brown-out behaviour |

These map directly to ISO 26262-5 fault models - see standard
expectations below.

## Safety-standard alignment

Cited by stable ID - the standards are gated, not WebFetchable.

| Standard | HIL expectation |
|---|---|
| **DO-178C §6.4.4 Structural Coverage** | Aircraft software at DAL A requires MC/DC; HIL is one of the means to *produce* that coverage on the integrated target |
| **DO-254** | The companion hardware standard. HIL exercises the **DO-254 + DO-178C interface** - the FPGA boundary |
| **ISO 26262-4 §7** | Vehicle-level test specification - HIL is mentioned as one of the recommended methods for system + integration test |
| **ISO 26262-5 §10** | Hardware fault injection - HIL fault patterns above map directly to this clause |
| **IEC 61508-3 Table A.5** | "Functional testing on a HIL rig" is a recommended technique at SIL 3 / SIL 4 |
| **IEC 62304** | Medical device software - HIL applies to perfusion pumps, ventilators, surgical robots; less prescriptive than 26262 |

## Test evidence the HIL produces

A typical HIL test report - the artefacts a certifier expects to
see - contains:

1. **System Definition** (NI: `.nivssdf`; dSPACE: SCALEXIO project) - the I/O map + plant-model binding. The "what is wired to what".
2. **Stimulus profile / scenario script** - the test inputs over
   time. Vector calls these "test modules" (CAPL); NI "real-time
   sequence" or "stimulus profile"; dSPACE "AutomationDesk
   sequence".
3. **Recorded signals** - every bus message + analog channel for
   the duration of the test, indexed by simulation time.
4. **Pass / fail verdict** - each scenario asserts on expected
   signal values, expected DTCs, expected timing.
5. **Coverage artefact** - pair with
   [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md);
   on-target structural coverage is captured via semihosting or a
   debug probe write-back.
6. **Traceability** - each scenario links back to a requirement ID
   (Polarion / DOORS / Jama). Required for any DAL or ASIL claim.

## CAPL / VeriStand stimulus example shapes

CAPL test module (Vector CANoe - cite "Vector CANoe 17 CAPL
Function Reference"):

```c
testcase Test_Brake_Latency()
{
    SetSignal(Vehicle::BrakePedal, 0.0);
    TestWaitForTimeout(100);
    SetSignal(Vehicle::BrakePedal, 1.0);
    if (TestWaitForSignalMatch(ECU::BrakeOutput, 1.0, 50) == 0)
        TestStepPass("Brake output engaged within 50 ms");
    else
        TestStepFail("Brake output did not engage in 50 ms");
}
```

NI VeriStand real-time sequence (cite "NI VeriStand 2024 Real-Time
Sequence Editor Help"):

```
SetChannelValue Inverter/Throttle 0.0
Wait 100 ms
SetChannelValue Inverter/Throttle 1.0
WaitUntilSettled Motor/Torque == 50.0 (tolerance 5.0, timeout 200 ms)
ReportTestResult
```

The two languages encode the same scenario - choose the one the
team is fluent in.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| HIL used as a regression rig for code-style checks | Rig time is expensive; lint runs on host | Push static + unit tests left; HIL only for system behaviour |
| Plant model never validated against real vehicle | "Successful" HIL run means nothing | Cross-validate plant against vehicle-on-dyno data |
| Fault-injection scenarios scripted but never replayed after firmware change | Regression invisible | Run the full fault-injection battery on every release candidate |
| Skipping PIL because "HIL covers it" | PIL catches compiler / target-CPU issues HIL can't | Keep PIL in the V-model |
| Recording everything but asserting on nothing | "Look at the trace" reviews don't scale | Each scenario must have machine-checkable assertions |
| Hardcoding I/O channel numbers in scenarios | Wiring changes break every script | Use channel aliases (VeriStand System Definition / CANoe `dbc` symbolic names) |
| HIL deadline missed silently | Real-time integrity violated | The simulator must monitor and FAIL on missed-deadline; not just log |

## Limitations

- **Plant-model fidelity is the ceiling.** HIL can only test what
  the plant model knows about. A motor model that omits thermal
  derating won't reveal a missing thermal-protection feature.
- **Cost.** A rig is $50k - $2M; rig-hours are scheduled like CT
  scanners. Push left aggressively.
- **Throughput.** Real-time means real time - a 60-second drive
  cycle takes 60 seconds to test. Parallel rigs help; faster-than-
  real-time isn't an HIL property.
- **Vendor lock-in.** Test assets in CAPL don't run on VeriStand
  and vice-versa. Architectural decision at procurement time.
- **EMC / RF effects not modelled.** HIL is electrical-emulation;
  it doesn't reproduce field-strength effects. Pair with EMC
  chamber tests for the safety case.
- **Battery / chemistry models drift.** Long-duration EV tests need
  refreshed cell models or the SoC accounting diverges.

## References

Cited inline. Foundational documents:

- Wikipedia, "Hardware-in-the-loop simulation" - 
  [en.wikipedia.org/wiki/Hardware-in-the-loop_simulation](https://en.wikipedia.org/wiki/Hardware-in-the-loop_simulation).
- Vector CANoe 17 User Manual (gated - cite by stable ID at
  [www.vector.com/int/en/products/products-a-z/software/canoe/](https://www.vector.com/int/en/products/products-a-z/software/canoe/)).
- NI VeriStand 2024 documentation (gated - cite by stable ID at
  [www.ni.com/en/shop/labview/labview-test/veristand.html](https://www.ni.com/en/shop/labview/labview-test/veristand.html)).
- dSPACE SCALEXIO 2024 / ControlDesk 2024 Help (gated - cite by
  stable ID).
- ISO 11898-1:2015 (CAN), ISO 17987-1:2016 (LIN),
  ISO 17458-1:2013 (FlexRay) - gated standards, cite by stable ID.
- IEEE 802.3bw-2015 (100BASE-T1), IEEE 802.3bp-2016 (1000BASE-T1) - 
  gated standards, cite by stable ID.
- AUTOSAR FO R23-11 SOME-IP Protocol Specification - open standard
  available from
  [www.autosar.org](https://www.autosar.org/)
  (subject to registration).
- DO-178C §6.4.4 Structural Coverage, DO-254, ISO 26262-4 §7 /
  ISO 26262-5 §10, IEC 61508-3 Table A.5, IEC 62304 - gated
  standards, cite by stable ID.
- Sibling reference:
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md).
