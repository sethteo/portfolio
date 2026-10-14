---
title: "Tap Into Hash [CyLab]"
date: "2026-10-14"
description: "Recovering a flag from an encrypted blockchain string by understanding SHA-256, byte-wise XOR, and how the token was inserted."
topics: [ctf, cryptography, python, security]
toc: true
draft: false
---

**Category:** Cryptography  
**Difficulty** Medium  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides us with a Python program, `block_chain.py`, and an output file, `enc_flag`. Our goal is to recover the flag hidden inside an encrypted blockchain string.

This one took a bit more reading than the previous Vault Door challenges. There is quite a bit of code involving blocks, SHA-256, proof of work, Base64, and encryption. However, after going through the program, I found that the part we really need to reverse is the XOR operation used by `encrypt()`.

## 2. Initial Analysis

The program first creates a blockchain consisting of a genesis block and four additional blocks. Each block stores information such as its index, the previous block's hash, a timestamp, its encoded transactions, and a nonce.

A block's hash is calculated using:

```python
def calculate_hash(self):
    block_string = f"{self.index}{self.previous_hash}{self.timestamp}{self.encoded_transactions}{self.nonce}"
    return hashlib.sha256(block_string.encode()).hexdigest()
```

`block_string.encode()` converts the string into bytes, since `hashlib.sha256()` works on bytes rather than a Python `str`.

The SHA-256 hash itself is 256 bits, or 32 bytes. However, `hexdigest()` returns those bytes as **64 hexadecimal characters**, since each byte is represented by two hexadecimal digits.

The program also performs a simple proof of work by repeatedly incrementing a block's nonce until its hexadecimal hash begins with `00`:

```python
while not is_valid_proof(block):
    nonce += 1
    block.nonce = nonce
```

Once all five blocks have been generated, the program joins their hashes using `-` as a separator:

```python
def blockchain_to_string(blockchain):
    block_strings = [f"{block.calculate_hash()}" for block in blockchain]
    return '-'.join(block_strings)
```

This gives us five 64-character hashes separated by four hyphens, for a total of `5 * 64 + 4 = 324` characters.

The important part comes next:

```python
encrypted_blockchain = encrypt(blockchain_string, token, key)
```

The `token` is our flag, and it is inserted into the blockchain string before the entire result is encrypted.

## 3. Understanding the Encryption

### 3.1 Inserting the Flag

Looking at `encrypt()`, the program splits the original blockchain string in half and inserts the token between the two parts:

```python
midpoint = len(plaintext) // 2

first_part = plaintext[:midpoint]
second_part = plaintext[midpoint:]
modified_plaintext = first_part + inner_txt + second_part
```

Since the original blockchain string has 324 characters, the flag is inserted at index `162`.

Afterwards, `pad()` converts the string to bytes and pads it to a multiple of 16 bytes:

```python
def pad(data, block_size):
    padding_length = block_size - len(data) % block_size
    padding = bytes([padding_length] * padding_length)
    return data.encode() + padding
```

The padding consists of bytes whose values indicate how many padding bytes were added. For the data in this challenge, the final plaintext has 382 bytes before padding, so two bytes of `0x02` are appended, giving 384 bytes in total.

### 3.2 SHA-256: `digest()` vs `hexdigest()`

Next, the program derives a value from the encryption key:

```python
key_hash = hashlib.sha256(key).digest()
```

This is different from the `hexdigest()` used to calculate each block's hash.

| Method | Output | Length |
|---|---|---|
| `digest()` | Raw `bytes` | 32 bytes |
| `hexdigest()` | Readable hexadecimal `str` | 64 characters |

Both represent the same 256-bit SHA-256 result. The difference is just how that result is represented.

The original key is generated using `secrets.token_hex(32)` and then converted using `bytes.fromhex()`, producing 32 random bytes. The program hashes those bytes before using the resulting digest for XOR.

### 3.3 XORing Each Block

Here is the part that actually transforms the plaintext:

```python
ciphertext = b''

for i in range(0, len(plaintext), block_size):
    block = plaintext[i:i + block_size]
    cipher_block = xor_bytes(block, key_hash)
    ciphertext += cipher_block
```

With `block_size = 16`, the program processes 16 bytes at a time.

The helper function is:

```python
def xor_bytes(a, b):
    return bytes(x ^ y for x, y in zip(a, b))
```

`zip(a, b)` pairs corresponding bytes from the two sequences. `^` then performs a bitwise XOR on each pair, and `bytes(...)` collects the results into a byte string.

There is one detail here: although the SHA-256 digest contains **32 bytes**, each plaintext block contains only **16 bytes**. Since `zip()` stops when the shorter sequence ends, the code only uses the **first 16 bytes of the digest** for every block.

Since we know the value being XORed with the plaintext, we can use the same XOR operation to recover it.

## 4. My Approach

The `enc_flag` file contains two printed values:

```text
Key: b'...'
Encrypted Blockchain: b'...'
```

These are Python representations of byte strings. The `b` prefix means we are dealing with `bytes`, and sequences such as `\x9e` represent individual byte values in hexadecimal.

The important thing is that **the original key is provided alongside the ciphertext**. We don't need to reverse SHA-256 or brute-force anything. We can just hash the provided key and use the resulting digest to undo the XOR operation.

In my `test.py`, I copied the key and encrypted blockchain bytes from `enc_flag`, then wrote a `decrypt()` function based on the original `encrypt()` implementation:

```python
def decrypt(ciphertext, key):
    block_size = 16
    key_hash = hashlib.sha256(key).digest()
    plaintext = b''

    for i in range(0, len(ciphertext), block_size):
        block = ciphertext[i:i + block_size]
        cipher_block = xor_bytes(block, key_hash)
        plaintext += cipher_block

    return plaintext
```

The code uses the same 16-byte blocks and the same derived SHA-256 key as the encryption function. The only real difference is that we're starting with ciphertext rather than plaintext. Because XOR is reversible, we don't need a separate inverse operation.

I then printed the result of `decrypt(ciphertext, key)`.

The output contains the original blockchain hashes with the flag inserted in the middle:

```text
...005fa3ded284d6570db7d5be3d05262bacacademy{block_3SRhViRbT1qcX_XUjM0r49cH_qCzmJZzBK_6d86bf8e}9003adecbe0371e53c2e598...
```


## 5. Flag

```text
academy{block_3SRhViRbT1qcX_XUjM0r49cH_qCzmJZzBK_6d86bf8e}
```

## 6. Key Takeaways

- Understanding the data flow was more useful than trying to reverse the blockchain hashes or SHA-256 itself.
