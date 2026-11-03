---
title: "Flag Hunters [CyLab]"
date: "2026-10-09"
topics: [ctf, reverse engineering, security]
toc: true
draft: false
---
**Category:** Reverse Engineering  
**Difficulty:** Easy  
**Platform:** CyLab (formerly picoCTF)

## 1. Challenge Overview

The challenge provides a Python program that simulates a song interpreter. Our objective is to exploit the program's logic to reveal a flag stored in `flag.txt`.

## 2. Initial Analysis

Upon inspecting the source code, we observe that:

- The flag is loaded from `flag.txt` and concatenated to `secret_intro`.
- The song is divided into individual lines using `splitlines()`.
- The program maintains a line pointer (`lip`) to track its current position.
- Special instructions in the song e.g `REFRAIN`, `RETURN`, and `END` control the song's execution.
- The `CROWD` instruction accepts user input.

## 3. Vulnerability Analysis

The vulnerability lies in the way the program handles user-controlled input:

```python
elif re.match(r"CROWD.*", line):
    crowd = input('Crowd: ')
    song_lines[lip] = 'Crowd: ' + crowd
    lip += 1
```

The program inserts unsanitized user input into `song_lines`, which is subsequently interpreted as executable song instructions.

Additionally, the program splits each line using semicolons:

```python
for line in song_lines[lip].split(';'):
```

This allows us to inject additional commands using `;` as a delimiter.

This condition is particularly interesting:

```python
elif re.match(r"RETURN [0-9]+", line):
    lip = int(line.split()[1])
```

The `[0-9]+` pattern accepts one or more digits, allowing us to redirect execution to any non-negative line index within the song.

## 4. Exploitation

The flag is embedded in the fourth line of the song (index `3` due to Python's zero-based indexing).

We can therefore inject the following payload when prompted for crowd input:

```text
;RETURN 3;
```

Our input modifies the song line to:

```text
Crowd: ;RETURN 3;
```

When the modified REFRAIN is revisited, the interpreter splits the line into separate commands and executes `RETURN 3`, redirecting execution to the line containing the flag.

Because the modified instruction remains in the song, it repeatedly redirects execution back to index `3` until the program reaches its maximum iteration count. At this point we can stop execution as we already got the flag.

## 5. Flag

```text
academy{70637h3r_f0r3v3r_4943a085}
```

## 6. Key Takeaways

- User input should never be interpreted as executable instructions without appropriate validation.
- Arbitrary jumps in an interpreter can expose data that was never intended to be displayed.
- The vulnerability could be prevented by separating user-controlled data from the interpreter's control instructions.
