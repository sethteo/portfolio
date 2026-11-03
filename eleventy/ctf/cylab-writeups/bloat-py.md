---
title: "Bloat.py [CyLab]"
date: "2026-10-14"
description: "Bypassing an obfuscated Python password check and understanding the repeating-key XOR decryption."
topics: [ctf, reverse engineering, python, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides an obfuscated Python script, `bloat.flag.py`, and an encrypted flag file, `flag.txt.enc`. Our goal is to recover the flag.

This reminded me quite a bit of Patchme.py, where we could simply bypass a local password check and let the program decrypt the flag for us. The main difference here is that the variable names and most of the strings have been deliberately made difficult to read.

## 2. Initial Analysis

The first thing I noticed was the alphabet defined at the start of the script:

```python
a = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ" + \
     "[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ "
```

Instead of using ordinary strings, the program builds them by referencing individual characters from this alphabet. For example, the password check is written as:

```python
if arg432 == a[71]+a[64]+a[79]+a[79]+a[88]+a[66]+a[71]+a[64]+a[77]+a[66]+a[68]:
    return True
```

Each index corresponds to a character. Evaluating the expression gives us:

```text
happychance
```

So the correct password is actually present in the source code, just hidden behind these index lookups. The names such as `arg133`, `arg432` and `arg444` don't tell us much either, which makes the code more tedious to follow.

This is **obfuscation**, rather than encryption. The program is trying to make the values less obvious to a reader, but we can still reconstruct them from the alphabet.

## 3. My Approach

I found that `arg132()` reads the encrypted flag:

```python
def arg132():
    return open('flag.txt.enc', 'rb').read()
```

And `arg111()` passes the encrypted data into the XOR function, `arg122()`:

```python
def arg111(arg444):
    return arg122(
        arg444.decode(),
        a[81]+a[64]+a[79]+a[82]+a[66]+a[64]+a[75]+a[75]+a[72]+a[78]+a[77]
    )
```

Since the program already provides everything needed to decrypt the file, I didn't need to enter the password at all. I commented out the code that collects the password and checks it, then called the decryption function directly:

```python
arg444 = arg132()
arg423 = arg111(arg444)
print(arg423)
```

This was enough to recover the flag. However, I also went through the obfuscated functions to understand what they were doing.

## 4. Understanding the Decryption

The second index expression in `arg111()` resolves to:

```text
rapscallion
```

This is the **XOR key**, which is different from the password `happychance`. The password only controls whether the program proceeds; the key is what is used to decrypt the flag.

The actual decryption happens in `arg122()`:

```python
def arg122(arg432, arg423):
    arg433 = arg423
    i = 0

    while len(arg433) < len(arg432):
        arg433 = arg433 + arg423[i]
        i = (i + 1) % len(arg423)

    return "".join([
        chr(ord(arg422) ^ ord(arg442))
        for (arg422, arg442) in zip(arg432, arg433)
    ])
```

This is the same idea as the repeating-key XOR function I analysed in Patchme.py.

First, it extends the key until it matches the length of the encrypted text. The ciphertext in this challenge is 35 bytes long, while `rapscallion` has 11 characters, so the expanded key becomes:

```text
rapscallionrapscallionrapscallionra
```

The modulo operation, `(i + 1) % len(arg423)`, makes the index wrap back to the start of the original key.

The final expression uses `zip()` to pair each encrypted character with a corresponding key character, `ord()` to convert both to integer values, XOR (`^`) to reverse the transformation, and `chr()` to turn the result back into a character.

The property that makes this work is:

```text
(plaintext ^ key) ^ key = plaintext
```

Applying XOR with the same key a second time restores the original value. Because the script gives us both the ciphertext and the XOR key, there's no need to brute-force anything.

## 5. Flag

Running my modified script prints:

```text
academy{d30bfu5c4710n_f7w_d77083fe}
```

## 6. Key Takeaways

- Obfuscating code != safe code
- A password check implemented locally can be bypassed when we can modify the source code.

The challenge itself was fairly straightforward once I traced the function calls. The useful part was separating the obfuscation from the actual XOR decryption instead of getting distracted by the meaningless function and variable names.
