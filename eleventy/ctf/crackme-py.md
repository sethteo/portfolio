---
title: "Crackme.py [CyLab]"
date: "2026-10-14"
description: "Recovering an encoded flag using ROT47 and understanding why the same operation can encode and decode it."
topics: [ctf, reverse engineering, python, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Python script containing an encoded secret and a function called `decode_secret()`. Our goal is to recover the hidden flag.

The script also contains a `choose_greatest()` function, but that part is commented out in my version. The interesting part is the ROT47 decoder and the secret stored near the top of the file.

## 2. Initial Analysis

The secret is stored as a string:

```python
bezos_cc_secret = "24256>JL`>0c0Abc?FE02a_53e7fe7af5gN"
```

The program also defines a reference alphabet containing 94 printable ASCII characters, from `!` to `~`. Spaces are not included.

Looking at `decode_secret()`, the code already tells us what transformation is being used:

```python
def decode_secret(secret):
    """ROT47 decode"""
    rotate_const = 47
    decoded = ""

    for c in secret:
        index = alphabet.find(c)
        original_index = (index + rotate_const) % len(alphabet)
        decoded = decoded + alphabet[original_index]

    print(decoded)
```

Essentially, the function shifts the position of each character by 47 places within the alphabet. This is known as **ROT47**, a substitution cipher.

## 3. Understanding ROT47

ROT47 works in a similar way to ROT13, except that it operates on 94 printable ASCII characters rather than just the 26 letters of the English alphabet.

For each character, the program first finds its position:

```python
index = alphabet.find(c)
```

It then calculates the new position:

```python
original_index = (index + 47) % len(alphabet)
```

The modulo operator (`%`) ensures that the position wraps around when it exceeds the length of the alphabet.

For example, the first character of the encoded secret is `2`.

- Its ASCII value is `50`.
- The reference alphabet starts at ASCII `33`, so its index is `50 - 33 = 17`.
- After shifting by 47 positions, `(17 + 47) % 94 = 64`.
- The character at index `64` is `a`.

Hence, the first encoded character `2` becomes `a`.

### Why does the same function work for encoding and decoding?

The reference alphabet has 94 characters, which is exactly twice the rotation amount.

If we apply the transformation twice, we shift by a total of 94 positions:

```text
(index + 47 + 47) % 94
= (index + 94) % 94
= index
```

So applying ROT47 twice returns us to the original character. We don't need separate encryption and decryption functions.

It's also worth distinguishing this from secure encryption. ROT47 doesn't use a secret key, and anyone who knows the transformation can reverse it. It's better described as an easily reversible encoding or substitution cipher.

## 4. My Approach

Since `decode_secret()` was already provided, I didn't need to write a new decoder. I simply called it with the encoded secret:

```python
print(decode_secret(bezos_cc_secret))
```

The function prints the decoded string, giving us the flag.

## 5. Flag

```text
academy{1m_4_p34nut_a20db6f76f27d8}
```

## 6. Key Takeaways

- ROT47 shifts characters by 47 positions within an alphabet of 94 printable ASCII characters.
- Applying ROT47 twice returns the original string, so the same transformation works for encoding and decoding.

