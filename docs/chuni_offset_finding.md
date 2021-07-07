# Notes on updating offsets for Crystal Plus

Windows 7 patch is missing.

Steps to determine these values:

1. Take old values from crystal
1. Use IDA's "Jump" -> "Jump to file offset..." feature to convert the file addresses to virtual memory addresses
1. Take chunithm crystal plus executable
1. Use virtual memory addresses from crystal, same spot is likely close to old one
1. Use some more instructions/bytes around the offsets from crystal to find same patterns on crystal plus
1. Check if disassembly area is identical regarding the change
1. At the bottom left of the disassembly text view, you see something like this: `00905500 | 00D06100: sub_D06100 (Synchronized with Hex View-1)`. The first address is the raw file address, the second one is the virtual address when loaded into memory
1. Take the first address once you found the exact same spot in chunithm crystal

Format below for addresses: crystal file address -> crystal virtual address -> crystal plus virtual address -> crystal plus file address

```
Allow 127.0.0.1/localhost as the network server",
0x905500 -> 00D06100 -> 00D97F80 -> 00997380
0x16CE988 -> 01AD0388 -> 01B17E80 -> 01717080

"Disable shop close lockout",
0x92D153 -> 00D2DD53 -> 00DBF6D3 -> 009BEAD3

"Force shared audio mode, system audio samplerate must be 48000",
0xCD470A -> 010D530A -> 010F26BA -> 00CF1ABA

"Force 2 channel audio output",
0xCD47E1 -> 010D53E1 -> 010F2791 -> 00CF1B91

"Patch for Windows 7",
0x1A404E8 -> jump failed
0x1A404F1 -> jump failed

"Disable Song Select Timer",
0x748FE2 -> 00B49BE2 -> 00B669C2 -> 00765DC2

"Set All Timers to 999",
0x5FC300 -> 009FCF00 -> 00A14870 -> 00613C70

"Better patch for head-to-head play",
0x464DB3 -> 008659B3 -> 00879A03 -> 00478E03

Increase max credits to 254",
0xC204B7 -> 010210B7 -> 01094767 -> 00C93B67

"Free Play",
0xC208D5 -> 010214D5 -> 01094B85 -> 00C93F85

"Dummy LED",
0x2499D7 -> 0064A5D7 -> 0064A5D7 -> 002499D7
```
