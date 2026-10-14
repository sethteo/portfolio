---
title: "Unpackme.py [CyLab]"
date: "2026-10-14"
description: "Decrypting a Fernet payload to inspect the Python code hidden inside it."
topics: [ctf, reverse engineering, python, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Python script containing an encrypted payload. Our goal is to recover the flag hidden within it.

Unlike the previous challenges where the flag was stored directly in the source code or transformed using XOR, this one uses `Fernet` from Python's `cryptography` library. The script decrypts the payload and executes the resulting code.

## 2. Initial Analysis

The important parts of the script are:

```python
import base64
from cryptography.fernet import Fernet

# The encrypted payload is stored in the script as a bytes object.
# payload = b'...'

key_str = 'correctstaplecorrectstaplecorrec'
key_base64 = base64.b64encode(key_str.encode())
f = Fernet(key_base64)
plain = f.decrypt(payload)
exec(plain.decode())
```

We are given both the encrypted payload and the string used to construct the decryption key. The script then calls `f.decrypt(payload)` and passes the decrypted contents to `exec()`.

This means the decrypted result is not necessarily the flag itself. It could be another Python program, which is exactly what happens here.

## 3. Understanding the Decryption

### 3.1 Constructing the Fernet key

First, the script processes the key:

```python
key_str = 'correctstaplecorrectstaplecorrec'
key_base64 = base64.b64encode(key_str.encode())
```

`key_str.encode()` converts the string into bytes. Since these are ASCII characters, each character is represented by one byte, giving us **32 bytes**.

Next, `base64.b64encode()` encodes those bytes into Base64. The result is a 44-character Base64 representation of the same 32 bytes:

```text
Y29ycmVjdHN0YXBsZWNvcnJlY3RzdGFwbGVjb3JyZWM=
```

Fernet expects a Base64-encoded 32-byte key, so we can pass this directly into `Fernet()`.

One distinction worth making here is that **Base64 is encoding, not encryption**. It changes how bytes are represented but does not make them secret. Fernet, on the other hand, performs authenticated encryption, meaning it both encrypts the data and checks whether the encrypted token has been tampered with.

### 3.2 Decrypting the payload

The next part is straightforward:

```python
f = Fernet(key_base64)
plain = f.decrypt(payload)
```

`payload` contains a Fernet token represented as bytes. With the correct key, `decrypt()` recovers the original plaintext, also as bytes.

The script then does:

```python
exec(plain.decode())
```

`plain.decode()` converts the bytes into a Python string, and `exec()` runs that string as Python code.

## 4. My Approach

Since the program already includes everything needed to decrypt the payload, I didn't need to break Fernet or brute-force its key.

I printed `plain` after the decryption step to see what was hidden inside. The decrypted bytes contain the following Python program:

```python
pw = input("What's the password? ")

if pw == 'batteryhorse':
    print('academy{175_chr157m45_034fb397}')
else:
    print('That password is incorrect.')
```

So the first script essentially decrypts and runs a second script containing a password check.

At this point, we can already see both the expected password and the flag. There is no need to execute the decrypted program or satisfy its condition to recover the flag.

## 5. Flag

```text
academy{175_chr157m45_034fb397}
```

