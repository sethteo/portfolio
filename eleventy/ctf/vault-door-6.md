---
title: "Vault Door 6 [CyLab]"
date: "2026-10-12"
description: "Understanding XOR encryption and how its reversible properties allow us to recover a password."
topics: [ctf, reverse engineering, java, cryptography, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Our goal is to figure out what input makes `checkPassword()` return `true`.

This time, the program uses bitwise XOR to transform our password before comparing it against a hardcoded byte array.

## 2. Initial Analysis

Looking at `checkPassword()`, the program first converts our password into a byte array using `getBytes()` and checks it against another array, `myBytes`.

The interesting part is how it performs the comparison:

```java
if (((passBytes[i] ^ 0x55) - myBytes[i]) != 0) {
    return false;
}
```

Okay so there are two operations happening here:

1. `passBytes[i] ^ 0x55` performs a bitwise XOR between our input byte and `0x55`.
2. The result is subtracted by `myBytes[i]`, and if the difference is not `0`, the function returns `false`.

Essentially, for our password to pass validation, we need:

```text
(passBytes[i] ^ 0x55) - myBytes[i] == 0
```

Or equivalently:

```text
passBytes[i] ^ 0x55 == myBytes[i]
```

Now how can we figure out what value `passBytes[i]` should be?

Before that, let's first understand XOR.

## 3. Understanding XOR

XOR (Exclusive OR) is a bitwise operation that compares two bits and returns `1` if they are different, and `0` if they are the same.

| A | B | A XOR B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

### So how does XOR encryption work?

One interesting property of XOR is that applying it twice with the same value restores the original value.

Mathematically:

```text
(A ^ B) ^ B = A
```

Why?

Because XORing a bit with the same bit twice effectively cancels out the changes.

For example:

```text
Original:     01101110 
Key:          01010101
              --------
Encrypted:    00111011

Encrypted:    00111011
Key:          01010101
              --------
Decrypted:    01101110  
```

We got back our original value!

This is the fundamental property that allows XOR to be used for both encryption and decryption.

In a basic XOR cipher:

```text
Ciphertext = Plaintext ^ Key
Plaintext  = Ciphertext ^ Key
```

The same operation can be used for both encryption and decryption, provided we have the same key.

### Is XOR encryption secure?

Well, not necessarily.

XOR is used in real cryptographic constructions, but simply XORing every byte with a fixed value is not secure.

In our case, the program uses `0x55` as the key for every single byte. This means that anyone who knows the key can reverse the transformation.

Furthermore, since the key is hardcoded into the source code, there isn't much secrecy to begin with.

On a side note, XOR is also fundamental to the **One-Time Pad**, which can provide perfect secrecy when the key is uniformly random, independent of the message, at least as long as the message, kept secret and never reused. However, this implementation is nowhere near that, since we're just reusing a single byte as our key.

## 4. My Approach

Now that we understand how XOR works, we can revisit our earlier condition:

```text
passBytes[i] ^ 0x55 == myBytes[i]
```

Using the property:

```text
(A ^ B) ^ B = A
```

We can XOR both sides with `0x55`:

```text
(passBytes[i] ^ 0x55) ^ 0x55 == myBytes[i] ^ 0x55
```

Since XORing twice with the same value cancels out, we get:

```text
passBytes[i] == myBytes[i] ^ 0x55
```

And that's pretty much our solution!

We already have every value in `myBytes`, so we can just XOR each element with `0x55` to recover the original password.

Rather than manually computing each value, I modified the original loop to print the decoded characters.

```java
for (int i = 0; i < 32; i++) {
    System.out.print((char)(myBytes[i] ^ 0x55));
}
```

Here, `myBytes[i] ^ 0x55` reverses the XOR transformation, while `(char)` converts the resulting numerical value into its corresponding character.

Running the modified program prints:

```text
n0t_mUcH_h4rD3r_tH4n_x0r_0cb705e
```

Lastly, we can just wrap the result in `academy{...}` to obtain our flag.

[Full solution on GitHub](https://github.com/sethteo/picoctf/blob/e5324f9be2432d5f243fa705a37a0c36c432d5a9/vault-door-training-6/VaultDoor6.java)

## 5. Flag

```text
academy{n0t_mUcH_h4rD3r_tH4n_x0r_0cb705e}
```

## 6. Key Takeaways

- XOR returns `1` when the two corresponding bits differ and `0` when they are the same.
- XOR is reversible: applying XOR twice with the same key restores the original value, `(A ^ B) ^ B = A`.


