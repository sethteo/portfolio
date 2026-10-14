---
title: "Safe Opener 2 [CyLab]"
date: "2026-10-14"
description: "Recovering a hardcoded flag by decompiling a Java class file."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

This challenge provides a compiled Java class file, `SafeOpener.class`, instead of the original `.java` source code. Our goal is to recover the flag hidden inside the program.

## 2. My Approach

I started by decompiling the `.class` file to reconstruct the Java source code. After looking through the decompiled code, I found that the flag was already hardcoded inside the `openSafe()` method.

The important part was essentially:

```java
public static boolean openSafe(String password) {
    String encodedkey = "academy{SAf3_0p3n3rr_y0u_solv3d_it_99d44813}";

    if (password.equals(encodedkey)) {
        System.out.println("Sesame open");
        return true;
    } else {
        System.out.println("Password is incorrect\n");
        return false;
    }
}
```

That's pretty much it. Unlike the first Safe Opener challenge, I didn't need to perform any Base64 decoding or write a separate script. The flag was already present as a string literal in the compiled program.

## 3. Flag

```text
academy{SAf3_0p3n3rr_y0u_solv3d_it_99d44813}
```
