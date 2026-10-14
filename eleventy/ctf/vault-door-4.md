---
title: "Vault Door 4 [CyLab]"
date: "2026-10-12"
description: "Recovering a password stored as bytes represented in different number bases."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Our goal is once again to figure out what input makes `checkPassword()` return `true`.

This time, instead of checking individual characters or rearranging our input, the program compares our password against an array of bytes.

## 2. Initial Analysis

Looking at `checkPassword()`, we see that our input is converted into a byte array using `getBytes()`.

```java
byte[] passBytes = password.getBytes();
```

The program then defines another byte array:

```java
byte[] myBytes = {
    106 , 85  , 53  , 116 , 95  , 52  , 95  , 98  ,
    0x55, 0x6e, 0x43, 0x68, 0x5f, 0x30, 0x66, 0x5f,
    0142, 0131, 0164, 063 , 0163, 0137, 070 , 070 ,
    'a' , '3' , '1' , 'd' , 'a' , 'd' , '6' , 'c' ,
};
```

Notice how the values are represented differently?

- **Decimal:** `106` represents the character `j`.
- **Hexadecimal:** `0x55` represents the character `U`.
- **Octal:** `0142` represents the character `b`.
- **Character literals:** `'a'` already represents the character `a`.

Despite the different representations, the values are all stored as bytes. The original program compares each byte of our input against the corresponding value in `myBytes`.

### What about the character literals?

One thing that initially confused me was the last eight elements of the array:

```java
'a', '3', '1', 'd', 'a', 'd', '6', 'c'
```

These are already characters, so I wasn't sure if casting them to `char` again would work.

However, notice how the array is declared as `byte[]` rather than `char[]`? Even though these values are written as character literals, Java allows them to be converted into bytes when initializing the array, provided their constant values fit within the `byte` range.

For example, `'a'` becomes the numerical byte value `97`. Hence, casting it back to `(char)` gives us `'a'` again.

So regardless of whether the original value was represented in decimal, hexadecimal, octal or as a character literal, we can recover these ASCII characters using `(char)`.

## 3. My Approach

Okay so since we already have the expected bytes, we can just convert them into characters instead of manually figuring out what each value represents.

Java allows us to cast a byte into a character using `(char)`.

Hence, I commented out the comparison and modified the loop to print the characters instead:

```java
for (int i = 0; i < 32; i++) {
    System.out.print((char)myBytes[i]);
}
System.out.println();
```

I also bypassed the original input validation since we only need to see the contents of `myBytes`. The modified program returns `true` unconditionally, so `Access granted` by itself doesn't prove our password was validated.

Running the program prints:

```text
jU5t_4_bUnCh_0f_bYt3s_88a31dad6c
```

And that's pretty much it! We can just wrap the output in `academy{...}` to obtain our flag.

[Full solution on GitHub](https://github.com/sethteo/picoctf/blob/e5324f9be2432d5f243fa705a37a0c36c432d5a9/vault-door-training-4/VaultDoor4.java)

## 4. Flag

```text
academy{jU5t_4_bUnCh_0f_bYt3s_88a31dad6c}
```

## 5. Key Takeaways

- Java supports decimal, hexadecimal and octal integer literals, but they ultimately represent numerical values.
- Character literals can be converted into bytes at compile time when their values fit within the `byte` range.
- Casting these ASCII byte values to `char` allows us to recover the corresponding characters without manually converting each value.
