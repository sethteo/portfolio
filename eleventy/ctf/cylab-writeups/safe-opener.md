---
title: "Safe Opener [CyLab]"
date: "2026-10-14"
description: "Recovering a hardcoded password by reversing Base64 encoding and understanding bytes versus strings."
topics: [ctf, reverse engineering, java, python, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a password to open a safe. Our goal is to recover the correct password and obtain the flag.

This one was pretty straightforward, since the program already contains the expected password, just not in plaintext.

## 2. Initial Analysis

Looking at `main()`, the program takes our input and Base64-encodes it before passing it to `openSafe()`:

```java
key = keyboard.readLine();
encodedkey = encoder.encodeToString(key.getBytes());
isOpen = openSafe(encodedkey);
```

Inside `openSafe()`, our encoded input is compared against a hardcoded string:

```java
public static boolean openSafe(String password) {
    String encodedkey = "cGwzYXMzX2wzdF9tM18xbnQwX3RoM19zYWYz";

    if (password.equals(encodedkey)) {
        System.out.println("Sesame open");
        return true;
    } else {
        System.out.println("Password is incorrect\n");
        return false;
    }
}
```

Since the user's password is Base64-encoded before the comparison, I assumed that the hardcoded string was also Base64-encoded. I tried decoding it using an online decoder and got:

```text
pl3as3_l3t_m3_1nt0_th3_saf3
```

That was enough to recover the password. I also wrote a small Python script to test the same decoding process.

## 3. Decoding with Python

My script was simply:

```python
import base64

encoded = "cGwzYXMzX2wzdF9tM18xbnQwX3RoM19zYWYz"

decoded_bytes = base64.b64decode(encoded)
print(decoded_bytes)

decoded_string = decoded_bytes.decode("utf-8")
print(decoded_string)
```

The output is:

```text
b'pl3as3_l3t_m3_1nt0_th3_saf3'
pl3as3_l3t_m3_1nt0_th3_saf3
```

One thing that initially confused me about Base64 decoding was why the first result looks almost identical to the second.

The key difference is the **data type**:

- `base64.b64decode(encoded)` returns a `bytes` object. Python displays it with a `b` prefix, and printable ASCII bytes appear as their corresponding characters.
- `.decode("utf-8")` interprets those bytes as UTF-8 text and returns a Python `str`.

For example, the character `p` is represented by the ASCII value `112`, which is `01110000` in binary or `0x70` in hexadecimal. The byte `0x70` and the character `'p'` are not the same Python data type, even though Python can display both in a similar way.

```python
print(type(decoded_bytes))   # <class 'bytes'>
print(type(decoded_string))  # <class 'str'>
```

## 4. Understanding Base64

Base64 is an encoding scheme rather than an encryption algorithm. It converts binary data into a string of characters that can be transported or stored as text.

A common Base64 encoding process takes **three bytes (24 bits)** and divides them into **four groups of six bits**. Each six-bit value maps to one of 64 Base64 characters.

For example, the first three characters of our password are `pl3`:

```text
'p' = 112 = 01110000
'l' = 108 = 01101100
'3' =  51 = 00110011

Combined: 01110000 01101100 00110011

6-bit groups: 011100 000110 110000 110011
             28      6     48     51
Base64:       c       G      w      z
```

This explains why the encoded password begins with `cGwz`.

Unlike hashing, Base64 encoding is designed to be reversible. We don't need a secret key or brute force here; we just decode the known string.

## 5. Flag

```text
academy{pl3as3_l3t_m3_1nt0_th3_saf3}
```

## 6. Key Takeaways

- Base64 is encoding, not encryption. Anyone with the encoded data can decode it.
- Python's `base64.b64decode()` returns bytes, and `.decode("utf-8")` converts those bytes into a string.
