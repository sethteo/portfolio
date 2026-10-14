---
title: "Fresh Java [CyLab]"
date: "2026-10-14"
description: "Decompiling a Java class file and using a small Python script to reconstruct its expected key."
topics: [ctf, reverse engineering, java, python, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides us with a compiled Java class file, `KeygenMe.class`, and our goal is to figure out the correct key.

Unlike the previous Vault Door challenges, we aren't given the Java source code directly. So before we can analyse the password validation, we first need to see what the compiled program is actually doing.

## 2. Decompiling the Java Class

I started by uploading `KeygenMe.class` to [decompiler.com](https://www.decompiler.com/) to decompile it into a readable Java file.

Just some FYI: Java source code is normally compiled into **bytecode**, which is stored in `.class` files and executed by the Java Virtual Machine (JVM). A decompiler attempts to reconstruct Java source code from that bytecode. The result might not be identical to the original source, but it is often enough for us to understand the program's logic.

Looking through the decompiled code, I noticed that the program checks the length of our input and then validates individual characters using `charAt()`.

For example, a check of this form:

```java
if (var2.charAt(5) != 'x') {
    System.out.println("Invalid key");
    return;
}
```

would mean that the character at index `5` must be `'x'` for the input to be valid. (This is just an example of the pattern, not a line copied from my decompiled file.)

Okay so this is pretty similar to Vault Door 1. We already have the expected characters in the conditions themselves. The only thing left to do is put them in the correct order.

## 3. My Approach

Rather than going through all the conditions manually, I wrote a small Python script to extract the index and character from each comparison.

Here is the script I used:

```python
from pathlib import Path
import re

source = Path("KeygenMe.java").read_text(encoding="utf-8")
checks = re.findall(r"var2\.charAt\((\d+)\)\s*!=\s*'(.)'", source)

password = [""] * 34
for index, char in checks:
    password[int(index)] = char

print(''.join(password))
```

Let's break down the regex first:

```python
r"var2\.charAt\((\d+)\)\s*!=\s*'(.)'"
```

- `var2\.charAt\(` matches the beginning of each character check.
- `(\d+)` captures the index inside `charAt()`.
- `\s*` allows for any whitespace around the `!=` operator.
- `'(.)'` captures the expected character between the single quotes.

`re.findall()` returns pairs containing the index and its corresponding character. For instance, the example `var2.charAt(5) != 'x'` would give us `("5", "x")`.

Next, I created a list with `34` empty slots because the program expects a key of length `34`:

```python
password = [""] * 34
```

Then we simply place each character at its respective index:

```python
for index, char in checks:
    password[int(index)] = char
```

Lastly, `''.join(password)` combines all the characters into a single string, giving us the expected key.

## 4. Key Takeaways

This was very similar to Vault Door 1, except that we had to decompile the program before we could start extracting the characters.
