# QEMU machines and CPUs for embedded testing

Per [target-arm.html](https://www.qemu.org/docs/master/system/target-arm.html), the ARM machines relevant to embedded testing include mps2-an385, mps2-an386, mps2-an500, mps2-an505, mps2-an511, mps2-an521, mps3-an524, mps3-an536, mps3-an547, the Stellaris lm3s6965evb / lm3s811evb, Raspberry Pi raspi0 / raspi1ap / raspi2b / raspi3ap / raspi3b / raspi4b, and Xilinx xilinx-zynq-a9 / xlnx-zcu102. The `virt` board is designed for use in virtual machines and does not correspond to any real hardware.

Match the machine to the CPU profile: mps2-* boards for M-profile cores, `virt` for A-profile, `virt` for RISC-V.

| Test target | QEMU command | Typical `-cpu` |
|---|---|---|
| Cortex-M0 / M0+ | `qemu-system-arm -M mps2-an385` | `cortex-m0` |
| Cortex-M3 | `qemu-system-arm -M mps2-an385` | `cortex-m3` (board default) |
| Cortex-M4 | `qemu-system-arm -M mps2-an386` | `cortex-m4` |
| Cortex-M7 | `qemu-system-arm -M mps2-an500` | `cortex-m7` |
| Cortex-M33 (TrustZone-M) | `qemu-system-arm -M mps2-an505 / mps2-an521 / mps3-an524` | `cortex-m33` |
| Cortex-A15 / A57 | `qemu-system-arm -M virt` (32-bit) / `qemu-system-aarch64 -M virt` (64-bit) | `cortex-a15` / `cortex-a57` / `max` |
| Stellaris LM3S6965 (older M3 reference) | `qemu-system-arm -M lm3s6965evb` | implicit |
| Raspberry Pi 3B (Cortex-A53) | `qemu-system-aarch64 -M raspi3b` | implicit (`cortex-a53`) |

`-machine help` lists all machines; `-cpu help` lists CPU models for the target.

Per [cpu-features.html](https://www.qemu.org/docs/master/system/arm/cpu-features.html), the special `max` CPU type is "available for comprehensive feature testing". Named CPU models generally do not work with KVM, but for emulation-only test runs (not KVM-accelerated) the named models work fine.
