---
title: "GDB Baby Step 3 & 4 [CyLab]"
date: "2026-10-31"
description: "Using GDB to examine little-endian bytes on the stack, step into a function, and trace a register value through assembly."
topics: [ctf, reverse engineering, assembly, gdb, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

I've been learning x86-64 assembly and GDB through the pwn.college challenges, and decided to try the GDB Baby Step challenges on CyLab to see whether I could apply what I've learned.

For Baby Step 3, the challenge gives us a constant, `0x2262c96b`, and asks us to examine the four bytes **as they are stored in memory** using `x/4xb`.

Baby Step 4 involves following execution from `main()` into another function, `func1()`. This was useful practice for understanding function calls and what happens to registers when a function returns.

## 2. GDB Baby Step 3 — Examining Memory Byte by Byte

### 2.1 Initial analysis

I first opened the binary in GDB:

```bash
gdb -q gdb_baby_step_3/debugger0_c
```

Then I disassembled `main`:

```gdb
disassemble main
```
![gdb_baby_step_3](../images/gdb-baby-steps/gdb_baby_step_3.png)

The important instructions were:

```asm
<main+15>: mov DWORD PTR [rbp-0x4],0x2262c96b
<main+22>: mov eax,DWORD PTR [rbp-0x4]
<main+25>: pop rbp
<main+26>: ret
```

The first instruction stores the constant `0x2262c96b` at a location on the stack, `rbp-0x4`. The next instruction reads the value from that memory location into `eax`.

Differences between the two:

- `rbp-0x4` is the **address** of the stack location.
- `[rbp-0x4]` means the **value stored at** that address, in Intel syntax.

Since we need to examine memory after the constant has been stored, I set a breakpoint at `main+22`:

```gdb
break *main+22
run
```

GDB stops **before** executing the instruction at the breakpoint. This means the `mov` at `main+15` has already executed, so the four bytes should be in memory.

### 2.2 Examining the bytes

I then ran:

```gdb
x/4xb $rbp-0x4
```

Which gave:

```text
0x7fffffffdacc: 0x6b  0xc9  0x62  0x22
```

Let's break down the command:

- `x` means examine memory.
- `4` means display four units.
- `x` means display each unit in hexadecimal.
- `b` means each unit is one byte.
- `$rbp-0x4` is the address we want to examine.

I also noticed that the bytes seemed to be in the reverse order of the original constant.

```text
Constant:          0x22 0x62 0xc9 0x6b
Stored in memory:  0x6b 0xc9 0x62 0x22
```

After some searching I found out this is because x86-64 uses **little-endian** byte ordering. For multi-byte integers, the least significant byte is stored at the lowest memory address.

I also got a little confused between reading a value from a register and examining memory. For example:

```gdb
x/4xb $eax
```

would tell GDB to treat the **value in `eax` as a memory address**, which is not what we want here. If I simply wanted to print the register's value, I should use `p/x $eax`. But the question asks for the bytes in memory, so the stack address is the right thing to inspect.

### 2.3 Flag

The challenge says to concatenate the four bytes in the order they appear in memory. Hence, my flag is:

```text
academy{0x6bc96222}
```

## 3. GDB Baby Step 4 — Following a Function Call

### 3.1 Initial analysis

For the next challenge, I opened the new binary:

```bash
gdb -q gdb_baby_step_4/debugger0_d
```

And disassembled `main()`:

```gdb
disassemble main
```
![gdb_baby_step_4](../images/gdb-baby-steps/gdb_baby_step_4.png)

These instructions stood out to me:

```asm
<main+19>: mov DWORD PTR [rbp-0x4],0x28e
<main+26>: mov DWORD PTR [rbp-0x8],0x0
<main+33>: mov eax,DWORD PTR [rbp-0x4]
<main+36>: mov edi,eax
<main+38>: call 0x401106 <func1>
<main+43>: mov DWORD PTR [rbp-0x8],eax
<main+46>: mov eax,DWORD PTR [rbp-0x4]
<main+49>: leave
<main+50>: ret
```

`main()` first stores `0x28e` in a local variable, loads that value into `eax`, and then copies it into `edi`.

Why `edi`? Under the x86-64 System V calling convention, the first integer argument is passed through `rdi` (or in this case `edi` where `edi` is the lower 32-bit portion of `rdi`)

This suggests that the program is passing `0x28e` into `func1()`.

### 3.2 Stepping into `func1()`

I set a breakpoint at the call:

```gdb
break *main+38
run
```

Then executed:

```gdb
stepi
```

GDB moved from the call in `main()` to the beginning of `func1()`:

```text
0x0000000000401106 in func1 ()
```

This is the difference between `stepi` and `nexti`:

- `stepi` (or `si`) executes one machine instruction and **steps into** a function call.
- `nexti` (or `ni`) executes one machine instruction but **steps over** calls, stopping when they return.

Since I wanted to understand what `func1()` was doing, `stepi` was the choice

### 3.3 Looking at the instructions inside the function

```gdb
display/10i $rip
```
Here, `$rip` refers to the current instruction pointer

The disassembly of `func1()` was:

```asm
<func1+0>:  endbr64
<func1+4>:  push rbp
<func1+5>:  mov rbp,rsp
<func1+8>:  mov DWORD PTR [rbp-0x4],edi
<func1+11>: mov eax,DWORD PTR [rbp-0x4]
<func1+14>: imul eax,eax,0x3269
<func1+20>: pop rbp
<func1+21>: ret
```

Essentially, `func1()` saves its input argument on the stack, loads it into `eax`, then multiplies it by `0x3269` using `imul`.

The key instruction is:

```asm
imul eax,eax,0x3269
```

This multiplies the value in `eax` by `0x3269` and stores the 32-bit result back into `eax`.

### 3.4 Flag
I can then submit the flag for this challenge which is the constant used to multiply `eax` by in decimal base which is `12905` in decimal.

```text
academy{12905}
```


## 4. Key Takeaways

- `x/4xb ADDRESS` examines four individual bytes in memory; `p/x $eax` prints a register value. They answer different questions.
- x86-64 is little-endian, so a multi-byte constant can appear reversed when inspected byte by byte in memory.

These challenges were relatively short, but were useful for connecting what I had learned about stack addresses, registers, and function calls to actual GDB sessions. I'm also starting to get more comfortable moving between the disassembly and the program's runtime state, rather than just reading individual instructions in isolation.
