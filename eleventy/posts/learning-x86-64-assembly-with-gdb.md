---
title: "Learning x86-64 Assembly with GDB"
date: "2026-10-30"
description: "First steps in x86-64 assembly, stack memory, calling conventions, breakpoints, and GDB scripting."
topics: [reverse engineering, assembly, gdb]
toc: true
draft: false
---
**Platform:** pwn.college — Debugging Refresher

## 1. Challenge Overview

After brushing up on my C programming skills with *Beej’s Guide to C Programming*, I’ve decided to dive deeper into low-level programming by learning GDB, an essential debugging tool to add to my arsenal, alongside x86-64 assembly. Having only worked with MIPS assembly during university, I’m excited to explore a different architecture and revisit topics that genuinely intrigued me back then.

Before this, most of my reverse-engineering practice came from challenges on CyLab where I was usually given the source code and had to work backwards from a password check. These challenges helped me get used to looking at what a program *does* to an input rather than simply running it and guessing. However, the source code was already there for me to read. With these GDB challenges, I had to figure out what the program was doing from the disassembly and its behaviour at runtime.

This write-up documents how I approached the challenges and, more importantly, the things I misunderstood along the way.

## 2. My Initial Approach: Comparing Registers

The program stopped at a breakpoint before the random value was set, and again after it was set. My first idea was to compare the registers before and after:

```gdb
info registers
continue
info registers
```

I assumed that if the random value was generated between the two stops, I might be able to identify it by looking for changes in the registers.

However, even though values such as `rax` and `r8` had changed, none of them seemed to contain the correct answer.

So what was wrong with my approach?

The issue is that registers are constantly being reused. Between two breakpoints, the program could have executed several instructions or function calls, each overwriting some of the register values. Comparing two snapshots only tells us what the registers contained **at those particular moments**, not what they contained throughout execution.

Also, I had assumed the random value would necessarily end up in a register. That turned out to be wrong.

## 3. Understanding the `read()` Call

I looked at the disassembly using:

```gdb
disassemble main
```

The interesting part was:

```asm
call open@plt
mov ecx,eax
lea rax,[rbp-0x18]
mov edx,0x8
mov rsi,rax
mov edi,ecx
call read@plt
```

At first, I could explain the individual `mov` instructions but didn't really know what the whole sequence was doing.

### 3.1 The x86-64 calling convention

On Linux x86-64, functions generally use the System V AMD64 calling convention. The first six integer or pointer arguments are placed in these registers:

| Argument | Register |
|---|---|
| 1st | `rdi` |
| 2nd | `rsi` |
| 3rd | `rdx` |
| 4th | `rcx` |
| 5th | `r8` |
| 6th | `r9` |

The function's integer or pointer return value is usually placed in `rax` (or `eax` for a 32-bit result).

Looking at the function signature for `read()`:

```c
ssize_t read(int fd, void *buf, size_t count);
```

`read()` requires a file descriptor, a destination buffer address, and the maximum number of bytes to read.

Knowing this, we can trace the assembly:

1. `open()` returns a file descriptor in `eax`.
2. `mov ecx,eax` temporarily saves the file descriptor in `ecx`.
3. `lea rax,[rbp-0x18]` calculates the address `rbp-0x18`.
4. `mov edx,0x8` sets the byte count to `8`.
5. `mov rsi,rax` places the destination address in the second argument register.
6. `mov edi,ecx` places the file descriptor in the first argument register.
7. `call read@plt` reads data into the destination buffer.

Essentially, the relevant C code looks something like:

```c
read(fd, &random_value, 8);
```

This explained why I couldn't find the random number just by comparing register values because the function writes them **directly to the memory address passed in `rsi`**.

### 3.2 Why `edi` works when the convention says `rdi`

Another thing that confused me was this instruction:

```asm
mov edi,ecx
```

I thought the first argument was supposed to go in `rdi`, so why was the program using `edi`?

After a search, it turns out that `edi` is just the lower 32 bits of `rdi`. They aren't independent registers. On x86-64, writing to a 32-bit general-purpose register also clears the upper 32 bits of its 64-bit parent.

So when we execute `mov edi,ecx`, the full `rdi` ends up containing the zero-extended value from `ecx`.

The same relationship exists for `eax`/`rax`, `edx`/`rdx`, and the other general-purpose registers.

### 3.3 `lea` versus `mov`

Another distinction I had to understand was the difference between these two instructions:

```asm
lea rax,[rbp-0x18]
mov rax,[rbp-0x18]
```

The first one calculates the **address** `rbp-0x18` and stores that address in `rax`. (*Although it can also be used for arithmetic more in a future write-up*)

The second one accesses memory at `rbp-0x18` and loads the **value stored at that address** into `rax`.

This matters because `read()` expects a pointer to a destination buffer, not the current value stored inside the buffer.

## 4. Inspecting the Stack in GDB

The challenge program had an `int3` instruction, which generates a breakpoint trap. When GDB stopped after the random value had been read, I used:

```gdb
x/gx $rbp-0x18
```

Here:

- `x` means examine memory.
- `g` means read eight bytes (a giant word).
- `x` displays the result in hexadecimal.
- `$rbp-0x18` is the stack address that was passed to `read()`.

On one run, I got:

```text
0x18cf92ab2d451ded
```

And that turned out to be the correct answer for that run!

I could also use the following to inspect the individual bytes:

This was probably the first big thing that clicked for me. A local variable doesn't necessarily stay in a register. It can be stored on the stack, and a function can write to it through an address supplied as an argument.

## 5. Identifying a Loop from Assembly

The next challenge followed a similar pattern, except there were multiple random values to recover.

Looking through the disassembly, I noticed there was only one `call read@plt`. Initially, that seemed strange because the program required multiple answers. But a function call can be executed repeatedly if it's inside a loop.

The relevant instructions were:

```asm
add DWORD PTR [rbp-0x1c],0x1
cmp DWORD PTR [rbp-0x1c],0x3
jle main+512
```

The counter started at `0`, and the program checked whether it was less than or equal to `3` before entering the loop body.

So the values of the counter were:

```text
0 -> 1st iteration
1 -> 2nd iteration
2 -> 3rd iteration
3 -> 4th iteration
4 -> exit the loop
```

Hence, the `read()` instruction could execute four times, assuming every answer was correct.

The program reused `[rbp-0x18]` to hold each new expected value. It then compared that value against the user's input stored at `[rbp-0x10]`. If the values were different, the program called `exit()` rather than proceeding to the next iteration.

### 5.1 One breakpoint was enough

Instead of setting a breakpoint for every iteration, I realised I could set a breakpoint just after `read()`:

```gdb
break *main+558
```

Then, every time the loop reached that instruction, GDB would stop and I could inspect the newly written value:

```gdb
x/gx $rbp-0x18
```

## 6. Why the Absolute Addresses Kept Changing

Another thing that confused me was seeing different addresses for what seemed to be the same instruction.

For example, an instruction might appear at one absolute address in the disassembly and another address when I ran the program again, while both were labelled `main+558`.

This can happen when a position-independent executable is loaded at a different address due to address-space layout randomisation (ASLR). (A topic I shall read up more on)

Therefore rather than hardcoding an absolute address, I should use:

```gdb
break *main+558
```

## 7. Automating the Process with a GDB Script

In a later challenge, I wanted to automate what I had been doing manually.

The program still read an eight-byte random value into `[rbp-0x18]`, then used `scanf()` to store user input at `[rbp-0x10]` before comparing both values.

My first idea was to copy the expected value directly into the user-input variable. However, if I did that *before* `scanf()` executed, `scanf()` could overwrite my change or wait for input anyway.

So I decided to set a breakpoint immediately before the `scanf()` call, write the expected value into its destination, and skip the call entirely by changing the instruction pointer (`rip`).

In the disassembly I was looking at, `scanf()` was at `main+855`, and the next instruction was at `main+860`.

Here's the GDB script I came up with:

```gdb
start
continue

break *main+855
commands
  silent
  set $local_variable = *(unsigned long long*)($rbp-0x18)
  set *(unsigned long long*)($rbp-0x10) = $local_variable
  set $rip = main+860
  continue
end

continue
```

Let's go through the interesting parts.

First, I read the expected value:

```gdb
set $local_variable = *(unsigned long long*)($rbp-0x18)
```

Then I write that value into the same stack location that would normally receive the user's input:

```gdb
set *(unsigned long long*)($rbp-0x10) = $local_variable
```

Lastly, I change the instruction pointer:

```gdb
set $rip = main+860
```

This tells the CPU to execute the instruction after the `scanf()` call. Unlike `ni`, which would step over the call *by executing it*, modifying `rip` lets me skip the call altogether.

Since the breakpoint is inside the loop, the same commands should run on every iteration.

### 7.1 Mistakes I made while writing the script

There were quite a few small issues with my first attempt:

- I initially placed two breakpoints before one `commands` block, without realising that the commands attach to the **most recently defined** breakpoint by default.
- I put `continue` in the middle of the command list, so the remaining commands wouldn't execute as intended.
- My first memory-write syntax was wrong. GDB needs a properly typed dereference for the write shown above.
- I initially thought about advancing `rip` by one instruction, but x86-64 instructions aren't all one byte long. Using the explicit destination `main+860` was clearer.

## 8. Key Takeaways

These challenges felt quite different from the Cylab challenges I have been doing. There, I was usually reading Java source code and reversing transformations such as XOR or bit swaps. Here, I had to understand how the compiled program passed arguments, manipulated memory, and decided which instruction to execute next.

The biggest things I've learned so far are:

- **Trace data rather than compare arbitrary register snapshots.** Registers are temporary, and the interesting value might live in memory.
- **Learn the calling convention.** Knowing what `rdi`, `rsi`, and `rdx` mean before a function call makes the assembly much easier to understand.
- **Distinguish an address from its contents.** `lea` and `mov` can look similar, but the difference matters a lot when pointers are involved.
- **Break at the moment the value becomes useful.** Stopping immediately after `read()` was more effective than hoping to find the random value in a later register snapshot.
- **GDB can change program state, not just inspect it.** Modifying stack memory and `rip` opened up a new way to approach the scripting challenge.

I still need more practice reconstructing what a compiled function is doing without searching up, but I think this is a useful next step from reversing transformations in high-level source code to understanding how a program actually executes at the machine level. (Something that was so interesting to me back in school)
