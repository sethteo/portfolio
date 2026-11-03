---
title: "Vault Door 3 [CyLab]"
date: "2026-10-12"
description: "Reversing a character shuffle by reusing the Java program's own logic."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Similar to the previous Vault Door challenges, our goal is to figure out what input makes `checkPassword()` return `true`.

However, this time the program rearranges our input before checking it against a hardcoded string.

## 2. Initial Analysis

Looking at `checkPassword()`, we see that the program first checks whether our input is exactly `32` characters long.

It then creates a character array called `buffer` and uses four loops to rearrange the characters of our input.

Finally, it converts the array back into a string and compares it against the expected value:

```java
String s = new String(buffer);
return s.equals("jU5t_a_sna_3lpm10g747_u_4_m7re49");
```

Okay so we already know what the resulting string should be. We just need to figure out what input produces it.

## 3. My Approach

This one was pretty straightforward. Rather than manually reversing each loop, I noticed that we could just reuse the function provided.

I added a print statement right before the return:

```java
String s = new String(buffer);
System.out.println(s);
return s.equals("jU5t_a_sna_3lpm10g747_u_4_m7re49");
```

Then I simply used the hardcoded string as my input:

```text
academy{jU5t_a_sna_3lpm10g747_u_4_m7re49}
```

Which printed:

```text
jU5t_a_s1mpl3_an4gr4m_4_u_777e09
Access denied!
```

So why does this work?

Looking back at the loops, the program is essentially performing a series of character rearrangements. The first eight characters remain unchanged, the next eight are reversed, and the remaining characters are rearranged based on whether their indices are even or odd.

The interesting part is that performing the same rearrangement twice restores the original string.

For example, the second loop maps:

```java
buffer[8] = password.charAt(15);
buffer[15] = password.charAt(8);
```

So these two positions are effectively swapped. Applying the same operation again swaps them back. The rearrangement of the even indices in the second half follows a similar pattern, while the odd indices remain in place.

Hence, by providing the expected output as our input, the function effectively reverses the transformation for us.

Lastly, we can use the resulting string as our password.

## 4. Flag

```text
academy{jU5t_a_s1mpl3_an4gr4m_4_u_777e09}
```

## 5. Key Takeaways

- A reversible transformation doesn't always require us to write a separate decoding function.
- Sometimes we can reuse the existing logic to work backwards, especially when applying the transformation twice restores the original input.
