---
title: "Vault Door 5 [CyLab]"
date: "2026-10-12"
description: "Reversing Base64 and URL encoding to recover a password."
topics: [ctf, reverse engineering, java, security]
toc: true
draft: false
---

**Category:** Reverse Engineering  
**Difficulty:** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Java program which asks us for a vault password. Our goal is to figure out what input makes `checkPassword()` return `true`.

This time, the program applies two layers of encoding to our password before comparing it against a hardcoded string.

## 2. Initial Analysis

Looking at `checkPassword()`, we can see how our input is processed:

```java
String urlEncoded = urlEncode(password.getBytes());
String base64Encoded = base64Encode(urlEncoded.getBytes());
```

Essentially, the program:

1. Converts our password into bytes and applies URL encoding.
2. Takes the URL-encoded result and applies Base64 encoding.
3. Compares the final encoded string against the expected value.

Okay so we already have the expected encoded string. We just need to reverse these operations to recover our password.

One important thing to note is that we have to reverse the operations in the opposite order. Since Base64 encoding was applied last, it must be decoded first.

## 3. My Approach

Rather than manually decoding the string, I decided to write a helper method using Java's built-in `Base64` and `URLDecoder` classes.

```java
public String urlDecode(String s) {
    byte[] decodedBytes = Base64.getDecoder().decode(s);
    String decodedString = new String(decodedBytes, StandardCharsets.UTF_8);

    try {
        return URLDecoder.decode(decodedString, "UTF-8");
    } catch (java.io.UnsupportedEncodingException e) {
        e.printStackTrace();
    }

    return "";
}
```

`Base64.getDecoder().decode(s)` converts our Base64-encoded string back into its original bytes.

We then convert those bytes into a string using UTF-8.

For example, the beginning of our decoded string looks like:

```text
%63%30%6e%76%33%72%74%31...
```

These are URL-encoded values, where each `%` is followed by a hexadecimal representation of a byte.

For example:

- `%63` represents `c`.
- `%30` represents `0`.
- `%6e` represents `n`.

Hence, we can just pass this string into `URLDecoder.decode()` to recover our original password.

Lastly, I modified `checkPassword()` to print the decoded result:

```java
System.out.println(urlDecode(expected));
```

Which gives us:

```text
c0nv3rt1ng_fr0m_ba5e_64_e340c3ed
```

We can wrap the output in `academy{...}` to obtain our flag.

[Full solution on GitHub](https://github.com/sethteo/picoctf/blob/e5324f9be2432d5f243fa705a37a0c36c432d5a9/vault-door-training-5/VaultDoor5.java)

## 4. Flag

```text
academy{c0nv3rt1ng_fr0m_ba5e_64_e340c3ed}
```

## 5. Key Takeaways

- When reversing multiple encoding operations, we need to decode them in the reverse order in which they were applied.
- Base64 and URL encoding are reversible transformations, not encryption.
