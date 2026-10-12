---
title: "Transformation [CyLab]"
date: "2026-10-10"
description: "Reversing a CTF flag encoding by unpacking pairs of ASCII characters with bit shifts and masks."
topics: [ctf, reverse engineering, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Easy  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides an `enc` file containing an encoded flag, along with the Python code used to transform it. Our goal is to understand the transformation and recover the original characters.

## 2. Initial Analysis

The encoder processes the flag two characters at a time. For each pair, its operation can be written as:

```python
chr((ord(flag[i]) << 8) + ord(flag[i + 1]))
```

Let the first character be `a` and the second be `b`:

- `ord(a)` and `ord(b)` return the characters' integer code points.
- Shifting `ord(a)` left by 8 bits moves its value into the upper 8 bits of a 16-bit value.
- Adding `ord(b)` places the second character's value in the lower 8 bits.
- `chr()` converts the combined value into a single Unicode character.

Each encoded character therefore holds two original ASCII characters. This is reversible encoding: no secret key is involved.

## 3. Reversing the Transformation

The important operation is the left shift:

```python
ord(flag[i]) << 8
```

ASCII values range from 0 to 127, with printable characters ranging from 32 to 126. Each character therefore fits within 8 bits. Shifting the first value left by 8 bits leaves eight zero bits for the second value, so adding them does not cause their bits to overlap.

For example, consider the pair `ab`:

```text
'a' = 97  = 01100001
'b' = 98  = 01100010

Shift 'a' left by 8:  01100001 00000000
Add 'b':             01100001 01100010
                     upper    lower
                     byte     byte
```

To reverse this, we extract the upper and lower bytes separately.

## 4. Decoding the Flag

First, we define a mask for each byte:

```python
MASK_A = 0xFF00  # Binary: 11111111 00000000
MASK_B = 0x00FF  # Binary: 00000000 11111111
```

Bitwise AND (`&`) keeps the bits selected by each mask. We then shift the upper byte right by 8 bits to recover the first character's original value:

```python
initial_a = (val & MASK_A) >> 8
initial_b = val & MASK_B
```

Finally, `chr()` converts each recovered value back into a character. Repeating this for every encoded character reconstructs the flag in order.

Below is my complete decoder.

```python
from pathlib import Path

MASK_A = 0xFF00
MASK_B = 0x00FF

# Read as Unicode text because each character stores a packed pair.
# Remove only trailing line endings added to the file.
enc = open('enc', 'r').read()
flag = ''

for c in enc:
    val = ord(c)
    MASK_A = int('0xFF00', 16)
    MASK_B = int('0x00FF', 16)

    initial_a = (val & MASK_A) >> 8
    initial_b = val & MASK_B
    flag += chr(initial_a) + chr(initial_b)


print(flag)
```

## 5. Flag

```text
academy{16_bits_inst34d_of_8_790ba37e}
```

## 6. Key Takeaways

- Bit shifts can pack values into separate parts of a larger integer; masks and reverse shifts can recover them.
- `ord()` and `chr()` convert between characters and their Unicode code points.
- An unfamiliar-looking string may simply be encoded. Understanding the transformation is often enough to reverse it.
