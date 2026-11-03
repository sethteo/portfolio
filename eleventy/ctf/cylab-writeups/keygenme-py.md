---
title: "Keygenme.py [CyLab]"
date: "2026-10-14"
description: "Reconstructing a license key from SHA-256 characters to unlock an encrypted Python program."
topics: [ctf, reverse engineering, python, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides us with a Python program called `keygenme-trial.py`.

Our goal is to figure out what the license key should be. We have access to the source code, so I started by looking at how the program validates the key.

## 2. Initial Analysis

The relevant variables are defined near the start of the program:

```python
username_trial = "MILLER"
bUsername_trial = b"MILLER"

key_part_static1_trial = "academy{1n_7h3_kk3y_of_"
key_part_dynamic1_trial = "xxxxxxxx"
key_part_static2_trial = "}"

key_full_template_trial = (
    key_part_static1_trial
    + key_part_dynamic1_trial
    + key_part_static2_trial
)
```

This already gives us most of the key. The only missing part is the eight characters represented by `xxxxxxxx`.

The `check_key()` function first checks the length of our input and verifies that the beginning matches `key_part_static1_trial`. It then checks the eight missing characters individually.

For example, the first two checks are:

```python
if key[i] != hashlib.sha256(username_trial).hexdigest()[4]:
    return False
else:
    i += 1

if key[i] != hashlib.sha256(username_trial).hexdigest()[5]:
    return False
else:
    i += 1
```

The remaining checks follow the same pattern, but use different indices. Since `i` increments after each successful comparison, these checks tell us exactly which characters belong in the missing portion of the key.

## 3. Understanding the SHA-256 Checks

The expression being used is:

```python
hashlib.sha256(username_trial).hexdigest()
```

`hashlib.sha256()` takes bytes as input and calculates a SHA-256 hash. Here, `username_trial` is passed as `b"MILLER"`, which is a bytes object rather than a normal Python string.

## 4. My Approach

I went through the eight comparisons in `check_key()` and noted the indices in order:

```python
ordering = [4, 5, 3, 6, 2, 7, 1, 8]
```

Rather than copying each character manually, I wrote a small Python script to construct the missing portion:

```python
import hashlib

def decrypt():
    ordering = [4, 5, 3, 6, 2, 7, 1, 8]
    bUsername_trial = b"MILLER"
    enc = hashlib.sha256(bUsername_trial).hexdigest()
    res = ""
    for i in ordering:
        res += enc[i]
    return res

print(decrypt())
```

Running the script prints:

```text
9edf443b
```

We can now replace `xxxxxxxx` in the license key template with these eight characters.

One small naming detail: although I called my helper `decrypt()`, it isn't actually decrypting anything. It's just calculating the known hash and extracting characters in the required order. (maybe reverse would've been better)

## 5. What the License Key Unlocks (Additional)

After checking the license, the trial program calls `decrypt_full_version()`:

```python
key_base64 = base64.b64encode(key_str.encode())
f = Fernet(key_base64)
full_version_code = f.decrypt(full_version)
```

This is separate from the SHA-256 checks. The full version of the program is stored as an encrypted Fernet payload.

The license key contains 32 ASCII characters. The program converts those characters to 32 bytes, then Base64-encodes the bytes into the format expected by `Fernet`.

It's worth distinguishing these two operations:

- **SHA-256** is used to determine the eight missing characters of the license key.
- **Fernet** uses the completed license key to decrypt the encrypted program.

Base64 doesn't encrypt the key or make it secret; it just represents the key bytes in an encoded format. With the correct key, the program can decrypt the full-version code and write it to `keygenme.py`.

## 6. Flag

Combining the static parts with the recovered eight characters gives us:

```text
academy{1n_7h3_kk3y_of_9edf443b}
```

## 7. Key Takeaways

- Knowing the original input to a hash makes it straightforward to reproduce the hash (1 to 1). We didn't need to reverse SHA-256 for this challenge.
- Base64 encoding and Fernet encryption serve different purposes: the former represents bytes, while the latter provides authenticated encryption.
