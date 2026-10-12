---
title: "Vault Door 8 [CyLab]"
date: "2026-10-12"
description: "Reversing a series of bit swaps to recover a password, and a small Java array mutation gotcha."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Hard  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides us with a Java program which asks for a vault password. Similar to the previous Vault Door challenges, our goal is to figure out what input makes `checkPassword()` return `true`.

This time, the source code is intentionally messy, but the important part is that it *scrambles the bits* of every character before comparing the result against a hardcoded array.

## 2. Initial Analysis

Looking at `checkPassword()`, we can see that our input is passed into `scramble()` before being compared against `expected`:

```java
char[] scrambled = scramble(password);
char[] expected = {
    0xF4, 0xC0, 0x97, 0xF0, 0x77, 0x97, 0xC0, 0xE4,
    0xF0, 0x77, 0xA4, 0xD0, 0xC5, 0x77, 0xF4, 0x86,
    0xD0, 0xA5, 0x45, 0x96, 0x27, 0xB5, 0x77, 0xD0,
    0xC1, 0xB4, 0xC0, 0xA5, 0xE0, 0xA5, 0xD0, 0xD0
};
return Arrays.equals(scrambled, expected);
```

So if we can reverse whatever `scramble()` is doing to the values in `expected`, we should get our original password.

Looking at the function, each character goes through eight calls to `switchBits()`:

```java
c = switchBits(c, 1, 2);
c = switchBits(c, 0, 3);
c = switchBits(c, 5, 6);
c = switchBits(c, 4, 7);
c = switchBits(c, 0, 1);
c = switchBits(c, 3, 4);
c = switchBits(c, 2, 5);
c = switchBits(c, 6, 7);
```

## 3. Understanding `switchBits()`

Before reversing the function, I wanted to understand how the bit swapping actually works.

Here is the relevant code:

```java
char mask1 = (char) (1 << p1);
char mask2 = (char) (1 << p2);

char bit1 = (char) (c & mask1);
char bit2 = (char) (c & mask2);
char rest = (char) (c & ~(mask1 | mask2));
char shift = (char) (p2 - p1);

char result = (char) (
    (bit1 << shift) |
    (bit2 >> shift) |
    rest
);
```

Okay so there are quite a few bitwise operations here, but essentially the function just swaps the bits at positions `p1` and `p2`, while leaving the remaining bits unchanged.

### 3.1 Creating the masks

First we have:

```java
char mask1 = (char) (1 << p1);
char mask2 = (char) (1 << p2);
```

`1 << p1` shifts the bit `1` to position `p1`. Remember that bit positions start from `0`, counting from the **rightmost** bit.

For example, if `p1 = 1` and `p2 = 2`:

```text
mask1 = 00000010
mask2 = 00000100
```

These masks let us isolate the two bits we want to swap using bitwise AND (`&`).

### 3.2 Extracting the bits and keeping the rest

Let's use the character `'s'` as an example. Its ASCII value is `115`, or `01110011` in binary.

```text
c     = 01110011
mask1 = 00000010
mask2 = 00000100
```

Applying `&` gives us:

```text
bit1 = c & mask1 = 00000010
bit2 = c & mask2 = 00000000
```

Now what about the other six bits that we don't want to change?

```java
char rest = (char) (c & ~(mask1 | mask2));
```

`mask1 | mask2` selects both positions, `~` flips that mask, and `&` clears just those two positions in `c`. Everything else is preserved.

```text
mask1 | mask2  = 00000110
rest           = 01110001
```

### 3.3 Swapping the positions

Lastly, we calculate the distance between the two positions and shift each selected bit across:

```java
char shift = (char) (p2 - p1);

char result = (char) (
    (bit1 << shift) |
    (bit2 >> shift) |
    rest
);
```

For our example, `shift = 2 - 1 = 1`.

```text
bit1 << 1 = 00000100
bit2 >> 1 = 00000000
rest      = 01110001
           --------
result    = 01110101
```

So swapping bits `1` and `2` changes `'s'` (`01110011`) into `01110101`, which is `'u'`.

Of course, the program doesn't stop there. It performs another seven swaps, eventually transforming `'s'` into `0xF4`, which matches the first value in `expected`.

## 4. My Approach

Now that we know `switchBits()` simply swaps two positions, reversing it is pretty straightforward.

**Swapping the same two bits twice restores the original value.** However, because there are multiple swaps, we have to undo them in the **reverse order**.

For example, if the original function does:

```text
Swap A → Swap B → Swap C
```

We reverse it with:

```text
Swap C → Swap B → Swap A
```

Hence, I added a `reverse()` function which applies the same `switchBits()` calls, but from the last one to the first:

```java
public char[] reverse(char[] expected) {
    for (int b = 0; b < expected.length; b++) {
        char c = expected[b];

        c = switchBits(c, 6, 7);
        c = switchBits(c, 2, 5);
        c = switchBits(c, 3, 4);
        c = switchBits(c, 0, 1);
        c = switchBits(c, 4, 7);
        c = switchBits(c, 5, 6);
        c = switchBits(c, 0, 3);
        c = switchBits(c, 1, 2);

        expected[b] = c;
    }

    return expected;
}
```

And that's the solution! By applying `reverse()` to the expected array and printing the characters, we recover the original password:

```text
s0m3_m0r3_b1t_sh1fTiNg_14c0f2f11
```

## 5. Flag

```text
academy{s0m3_m0r3_b1t_sh1fTiNg_14c0f2f11}
```

## 6. Key Takeaways

- Bitwise AND (`&`) and masks let us isolate individual bits, while shifts (`<<` and `>>`) move them to different positions.
- Bitwise OR (`|`) lets us combine the moved bits with the bits that weren't changed.
- Swapping two bits is its own inverse, but when reversing a sequence of swaps, we need to undo them in the opposite order.
