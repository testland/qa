# QEMU invocation flags for embedded test runs

Per [invocation.html](https://www.qemu.org/docs/master/system/invocation.html):

| Flag | Effect |
|---|---|
| `-M [type=]name[,prop=value,...]` | Select emulated machine; `-machine help` lists all |
| `-cpu model` | Select CPU model; `-cpu help` lists models for the target |
| `-smp [cpus=]n[,cores=...,...]` | SMP topology - for multi-core test targets |
| `-m [size=]megs[,slots=n,maxmem=size]` | Guest RAM; M / G suffixes |
| `-kernel file` | Kernel image loaded directly into guest memory - for embedded tests, this is the test ELF |
| `-bios file` | Custom BIOS / ROM image |
| `-append "<string>"` | Kernel command-line arguments (Linux targets) |
| `-nographic` | No GUI; serial to console |
| `-serial stdio` | Redirect serial port to host stdin / stdout |
| `-monitor stdio` / `-monitor tcp:host:port` | QEMU human monitor |
| `-qmp tcp:host:port[,server,nowait]` | QMP machine protocol over TCP - JSON-RPC |
