---
title: "Vault Door 7 [CyLab]"
date: "2026-10-12"
description: "Reversing a Java password check by unpacking 32-bit integers into their original ASCII characters."
topics: [ctf, reverse engineering, java, bitwise, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Hard  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Our goal is to figure out what input makes `checkPassword()` return `true`.

This time, rather than comparing each character individually, the program converts a 32-character password into an array of eight integers and checks those integers against hardcoded values.

Okay so we already have the expected integers. We just need to work backwards to recover the original string.

## 2. Initial Analysis

Looking at `checkPassword()`, we see that our input must contain exactly 32 characters:

```java
if (password.length() != 32) {
    return false;
}

int[] x = passwordToIntArray(password);
return x[0] == 1096770097
    && x[1] == 1952395366
    && x[2] == 1600270708
    && x[3] == 1601398833
    && x[4] == 1716808014
    && x[5] == 1734292791
    && x[6] == 895890230
    && x[7] == 808608100;
```

The important part is `passwordToIntArray()`, which tells us how the password is transformed:

```java
public int[] passwordToIntArray(String hex) {
    int[] x = new int[8];
    byte[] hexBytes = hex.getBytes();
    for (int i = 0; i < 8; i++) {
        x[i] = hexBytes[i*4]   << 24
             | hexBytes[i*4+1] << 16
             | hexBytes[i*4+2] << 8
             | hexBytes[i*4+3];
    }
    return x;
}
```

I understood that the function was somehow combining four characters into one integer, but I wanted to understand the whole conversion from a string to bytes, then bits, and finally an integer.

## 3. Understanding Strings, Bytes and Bits

### 3.1 What exactly is a bit or a byte?

A **bit** is a single binary digit, either `0` or `1`. A **byte** consists of eight bits, which means it can represent 256 different bit patterns (`2^8`).

For example, the uppercase letter `A` has an ASCII value of `65`:

```text
Character: A
Decimal:   65
Hex:       0x41
Binary:    01000001
```

These aren't four different things. They're different ways of representing the *same value*.

### 3.2 How does a Java string become bytes?

In Java, a `String` contains characters. However, when we call:

```java
byte[] hexBytes = hex.getBytes();
```

Java **encodes** the string into a sequence of bytes using the default character encoding.

For this challenge, all the password characters are ASCII, so each character is represented by one byte in the usual ASCII-compatible encodings.

Let's take the first four characters of our eventual password, `A_b1`, as an example:

| Character | Decimal | Hexadecimal | Binary (8 bits) |
| --- | ---: | --- | --- |
| `A` | 65 | `0x41` | `01000001` |
| `_` | 95 | `0x5F` | `01011111` |
| `b` | 98 | `0x62` | `01100010` |
| `1` | 49 | `0x31` | `00110001` |

So this string becomes four bytes:

```text
"A_b1"
   ↓ getBytes()
[0x41, 0x5F, 0x62, 0x31]
   ↓ represent each byte in binary
01000001 01011111 01100010 00110001
```

One thing to note is that **a character is not always one byte**. For example, some Unicode characters need multiple bytes when encoded as UTF-8. We can treat one character as one byte here because the password uses ASCII characters.

Also, a string that *looks* hexadecimal is still just a string unless we explicitly parse it as hexadecimal. For example, the string `"01ab"` contains the four characters `'0'`, `'1'`, `'a'` and `'b'` rather than two numeric bytes `0x01` and `0xAB`.

### 3.3 Packing four bytes into an integer

Now we can look at this statement again:

```java
x[i] = hexBytes[i*4]   << 24
     | hexBytes[i*4+1] << 16
     | hexBytes[i*4+2] << 8
     | hexBytes[i*4+3];
```

In Java, an `int` is 32 bits. Since each byte is eight bits, we can fit four bytes into a single integer (`4 × 8 = 32`).

But how does the program know where each byte should go?

That's where the bit shifts come in:

- `<< 24` moves the first byte to the leftmost eight-bit position.
- `<< 16` moves the second byte into the next eight-bit position.
- `<< 8` moves the third byte into the next position.
- The fourth byte stays in the rightmost position.

For our `A_b1` example:

```text
A: 01000001 << 24  = 01000001 00000000 00000000 00000000
_: 01011111 << 16  = 00000000 01011111 00000000 00000000
b: 01100010 <<  8  = 00000000 00000000 01100010 00000000
1: 00110001        = 00000000 00000000 00000000 00110001
                     ---------------------------------------
Combined using |:    01000001 01011111 01100010 00110001
```

The `|` symbol is **bitwise OR**, which combines the values. Since we shifted each byte into its own eight-bit section, their `1` bits don't overlap.

This gives us:

```text
Binary:  01000001010111110110001000110001
Hex:     0x415F6231
Decimal: 1096770097
```

Which is exactly the first integer checked in `checkPassword()`.

So each of the eight integers is essentially storing four of our original characters. This isn't encryption, the program is just packing the bytes into larger numbers.

## 4. My Approach — Reversing the Process

Since the password has 32 ASCII characters and each integer holds four of them, we can just reverse the process for all eight integers.

Rather than manually converting each integer, I wrote a `reverse()` method:

```java
public void reverse() {
    int[] arr = {
        1096770097, 1952395366, 1600270708, 1601398833,
        1716808014, 1734292791, 895890230, 808608100
    };
    List<String> res = new ArrayList<>();

    for (int a : arr) {
        // First convert to binary
        String binaryString = Integer.toBinaryString(a);
        // Pad to 32 bits
        String padded = String.format("%32s", binaryString).replace(' ', '0');

        for (int i = 0; i < 4; i++) {
            int decimal = Integer.parseInt(padded.substring(i*8, i*8+8), 2);
            res.add(String.valueOf((char)decimal));
        }
    }
    System.out.println(String.join("", res));
}
```

Let's go through what it does.

### 4.1 Converting the integer back into bits

First, I used:

```java
String binaryString = Integer.toBinaryString(a);
```

This returns the binary representation of our integer as a string. However, it doesn't necessarily include leading zeroes, so I padded it to 32 bits:

```java
String padded = String.format("%32s", binaryString).replace(' ', '0');
```

For the first integer, we now have:

```text
01000001010111110110001000110001
```

This is the same 32-bit pattern that the original function produced.

### 4.2 Splitting the bits back into four bytes

Next, I used a loop to extract eight bits at a time:

```java
for (int i = 0; i < 4; i++) {
    int decimal = Integer.parseInt(padded.substring(i*8, i*8+8), 2);
    res.add(String.valueOf((char)decimal));
}
```

`Integer.parseInt(..., 2)` converts each eight-bit binary string into its numerical value. The `2` tells Java that the input is written in base 2.

Then `(char)decimal` converts the number into its corresponding character, and `String.valueOf()` turns it into a string which we add to `res`.

Lastly, `String.join("", res)` combines every recovered character into the original password.

Running my modified program prints:

```text
A_b1t_0f_b1t_sh1fTiNg_575f3602ad
```

Wrapping it in `academy{...}` gives us the flag!

[Full solution on GitHub](https://github.com/sethteo/picoctf/blob/e5324f9be2432d5f243fa705a37a0c36c432d5a9/vault-door-training-7/VaultDoor7.java)

## 5. Flag

```text
academy{A_b1t_0f_b1t_sh1fTiNg_575f3602ad}
```

## 6. Key Takeaways

- Understanding how data is represented matters more than how complicated its numerical representation looks.
