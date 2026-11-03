---
title: "Vault Door 1 [CyLab]"
date: "2026-10-11"
description: "Recovering a password from shuffled Java character checks, first manually and then with a small Python script."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Our goal is to figure out what input makes `checkPassword()` return `true`.

The source code does not store the password as one complete string. Instead, it checks individual characters in a shuffled order.

## 2. Initial Analysis

Looking at `main()`, we see that the program removes the flag wrapper before checking our input:

```java
String input = userInput.substring("academy{".length(), userInput.length() - 1);
```

So `checkPassword()` receives only the part inside `academy{...}`. The method then checks that this string is exactly `32` characters long and that every character matches its expected value.

Here is part of the original check:

```java
return password.length() == 32 &&
       password.charAt(0) == 'd' &&
       password.charAt(29) == 'f' &&
       password.charAt(4) == 'r' &&
       password.charAt(2) == '5' &&
       // ...
       password.charAt(31) == '3';
```

Since these conditions are joined by `&&`, every check must pass. Java uses zero-based indexing, so `charAt(0)` tells us the first character, `charAt(1)` tells us the second, and so on.

## 3. My Approach

Okay so we already have every character of the password, just in the wrong order. My approach was to rearrange the checks by their indices, starting from `0` and ending at `31`.

After rearranging, the first few checks become:

```java
password.charAt(0) == 'd' &&
password.charAt(1) == '3' &&
password.charAt(2) == '5' &&
password.charAt(3) == 'c' &&
password.charAt(4) == 'r'
```

We can now just read the characters from top to bottom. These first five give us `d35cr`, and doing the same for the remaining checks gives us the full password:

```text
d35cr4mbl3_tH3_cH4r4cT3r5_e3ff63
```

Lastly we wrap it in `academy{...}` to get the flag. The capital letters matter because the character comparisons are case-sensitive.

## 4. A Cleaner Way

Rearranging the checks manually works for this challenge, but it is easy to miss a line or copy a character incorrectly. We can automate the same idea with a small Python script.

Notice how each check already gives us an index and its corresponding character. We don't actually need to sort the checks. We can create a list with `32` slots and place each character directly into its correct position.

Save this script beside the original `VaultDoor1.java` file:

```python
from pathlib import Path
import re

source = Path("VaultDoor1.java").read_text(encoding="utf-8")
checks = re.findall(r"password\.charAt\((\d+)\)\s*==\s*'(.)'", source)

password = [""] * 32
for index, char in checks:
    password[int(index)] = char

print("academy{" + "".join(password) + "}")
```

The regular expression matches the character checks in this challenge:

- `password\.charAt\(` matches the start of each check.
- `(\d+)` captures the index as a string, which we then convert using `int()` in the loop.
- `\s*` matches zero or more whitespace characters around the `==`
- `'(.)'` captures the single character between the quotes.

For example, `password.charAt(29) == 'f'` gives us the pair `("29", "f")`, so we assign `password[29] = "f"`. Once every slot is filled, `"".join(password)` combines the characters in index order.

## 5. Flag

```text
academy{d35cr4mbl3_tH3_cH4r4cT3r5_e3ff63}
```

## 6. Key Takeaways

- Basic regex using Python
