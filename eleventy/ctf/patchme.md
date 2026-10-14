---
title: "Patchme.py [CyLab]"
date: "2026-10-14"
description: "Bypassing a Python password check and understanding how repeating-key XOR is used to decrypt a flag."
topics: [ctf, reverse engineering, python, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides us with a Python script and an encrypted flag file, `flag.txt.enc`. Our goal is to recover the flag by getting past the password check.

However, rather than storing the flag in plaintext, the program uses an XOR function to decrypt it after a successful password check.

## 2. Initial Analysis

Looking at `level_1_pw_check()`, we see that the program takes our password as input and only proceeds with the decryption if it matches a predefined value.

Here is the relevant part of my modified program:

```python
def level_1_pw_check():
    user_pw = input("Please enter correct password for flag: ")
    if user_pw == "test":
        print("Welcome back... your flag, user:")
        decryption = str_xor(flag_enc.decode(), "utilitarian")
        print(decryption)
        return
    print("That password is incorrect")
```

Okay so since we have access to the source code, we can just modify the condition to accept a password of our choosing. Alternatively, we could use the password directly from the original condition.

For example, we could simply change the condition to:

```python
if True:
```

This effectively bypasses the password check, allowing us to execute the decryption regardless of what we enter.

Or we could just call the decryption function directly, since the encrypted flag and the key are already provided to the program.

So obtaining the flag is pretty straightforward. However, I was also interested in understanding how the `str_xor()` function actually works.

## 3. Understanding `str_xor()`

Looking at the decryption function:

```python
def str_xor(secret, key):
    new_key = key
    i = 0

    while len(new_key) < len(secret):
        new_key = new_key + key[i]
        i = (i + 1) % len(key)

    return "".join([
        chr(ord(secret_c) ^ ord(new_key_c))
        for (secret_c, new_key_c) in zip(secret, new_key)
    ])
```

Let's break this down.

### 3.1 Extending the Key

The first thing that caught my attention was the `while` loop:

```python
new_key = key
i = 0

while len(new_key) < len(secret):
    new_key = new_key + key[i]
    i = (i + 1) % len(key)
```

We know that our key is `"utilitarian"`, which has a length of `11`.

However, from inspecting the program, I found that the encrypted string has a length of `36`.

So what happens when the key is shorter than the secret?

Notice how the loop keeps appending characters from the original key until `new_key` has the same length as `secret`.

The interesting part is:

```python
i = (i + 1) % len(key)
```

This ensures that `i` always remains within the valid indices of our original key.

For example, since `len(key) == 11`, our indices range from `0` to `10`. When `i` reaches `10`, the next iteration resets it to `0` because:

```text
(10 + 1) % 11 = 0
```

Hence, we essentially keep cycling through the original key.

Since our secret has a length of `36`, the loop appends another `25` characters to the original `11` characters.

Our resulting key becomes:

```text
utilitarianutilitarianutilitarianuti
```

So now we have a key which is the same length as our encrypted string.

### 3.2 Performing XOR

Next, let's look at the return statement:

```python
return "".join([
    chr(ord(secret_c) ^ ord(new_key_c))
    for (secret_c, new_key_c) in zip(secret, new_key)
])
```

There's quite a bit going on here, so let's break it down further.

First, we have:

```python
zip(secret, new_key)
```

`zip()` pairs the characters from both strings based on their corresponding indices.

For example:

```text
secret:   A B C D ...
new_key:  u t i l ...
```

This gives us:

```text
('A', 'u')
('B', 't')
('C', 'i')
('D', 'l')
...
```

Of course, these are just example characters rather than the actual encrypted values.

Next, we perform:

```python
chr(ord(secret_c) ^ ord(new_key_c))
```

- `ord()` converts each character into its corresponding Unicode code point.
- `^` performs a bitwise XOR between the two integer values.
- `chr()` converts the resulting integer back into a character.

For example, let's say our encrypted character is `'4'` and our key character is `'u'`.

```text
'4' = 00110100
'u' = 01110101
      --------
XOR = 01000001
```

The result is `01000001`, which corresponds to `'A'`.

So by XORing the encrypted character with the key character, we recover the original character.

Why does this work?

As covered in my previous write ups, XOR has the property:

```text
(A ^ B) ^ B = A
```

This means that XORing an encrypted value with the same key used during encryption restores the original value.

Lastly, `"".join()` combines all the resulting characters into a single string, giving us our decrypted flag.

## 4. My Approach

In my case, I didn't actually need to modify or reverse the XOR function because the program already provides the decryption logic and its key.

I simply modified the password condition to accept a value of my choosing and allowed the program to perform the decryption.

The more interesting part for me was analysing the function afterwards, particularly how it extends the key and uses `zip()`, `ord()`, `chr()`, and XOR to reconstruct the original string.

One thing worth noting is that this is an example of **repeating-key XOR**, where the same key is reused throughout the message.

Although XOR can be used in cryptography, repeatedly XORing data with a fixed, known key doesn't provide much security. In this case, the key is already hardcoded into the script, so anyone with access to the source code and encrypted flag can decrypt it.

## 5. Flag

After modifying the password condition and running the program, we get:

```text
academy{p47ch1ng_l1f3_h4ck_2badcb64}
```

## 6. Key Takeaways

- Having access to the source code allows us to bypass locally implemented password checks.
- Hardcoding the encryption key within the source code provides little security when the encrypted data is also accessible.
