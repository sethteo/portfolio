---
title: "0/1 Search?"
date: "2026-09-25"
description: "Binary Search is not that simple after all."
lead: "My guide on a fundamental algorithm."
topics: ["data structure and algorithms", "leetcode"]
toc: true
---
I will go through this in stages, where I will first go through the algorithm then delve deeper into the unique applications of the algorithm by making minor tweaks.
## Basic Binary Search

```python
def binary_search(left, right, target):
  while left <= right:
    mid = left + ((right - left) // 2)
    if mid == target:
      return mid
    elif mid > target:
      right = mid - 1
    else:
      left = mid + 1
  return -1
```
I won't bore you with the intricacies of the algorithm and will just give a layman explanation
- We use `while left <= right` because `left == right` is a possible candidate of our target and should not be skipped.
- `mid = left + ((right - left) // 2)` is good convention to not accidentally cause an integer overflow as compared to doing `mid = (left + right) // 2`
- So if mid is greater than our target, we should search the left partition and conversely if mid is less than our target we search the right
- Lastly if we ever hit `return -1`, it means that our target was not found and we use `-1` as a placeholder for it.

## Lower Bound Binary Search

In this version of binary search, we are trying to find the first value of x that can satisfy the given condition. Let us use Leetcode question [278. First Bad Version](https://leetcode.com/problems/first-bad-version/description/) to illustrate.

Here we are given n versions from [1, n] inclusive and our goal is to find the first version that is bad. We are provided with a helper method which checks if a version is bad. 

Naively we can just scan linearly and we are bound to find and answer however it will take `O(N)` time. So how can we do better?

Notice how the description of the problem is basically just the first sentence of this topic, hence lets use binary search for this problem to cut our runtime to `O(log(n))`.

```python
def solution(n):
  left = 1
  right = n

  while left <= right:
    mid = left + ((right - left) // 2)
    if isBadVersion(mid): 
      right = mid - 1
    else:
      left = mid + 1

  return left
```
Very similar skeleton to our base binary search however some tweaks which I will explain
- Our conditions are now just an `if` and `else` why? Because we cant just return `mid` if `isBadVersion(mid)` returns `True` because what if a previous version also is a bad version?
- If `isBadVersion(mid) == True`, then `mid` and everything to its right are bad, so the first bad version must be at `mid` or somewhere to the left. Therefore we move `right = mid - 1`
- If `mid` is good, then `mid` and everything to its left are good, so we move `left = mid + 1`
- So why do we just return `left`?
  - Every good midpoint moves `left` past a region that is definitely good
  - Every bad midpoint moves `right` before a region that is definitely bad
  - At the point where `left` and `right` cross (`left > right`), everything before `left` is good and everything after `right` is bad
  - Since `left = right + 1` at termination, `left` sits exactly at the boundary between good and bad versions, so it is the first bad version


## Upper Bound Binary Search
Using Leetcode question [981. Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/description/)

We need to create a data structure that can handle key-value pairs and answer a `get(key, timestamp)` query where we must return a value within our data structure that fulfils `dict[key] <= timestamp`.

Okay so "handle key-value pairs", I immediately think of a hashmap, so I am looking at a mapping `key : [(timestamp, value), (timestamp, value)...]`

Now how can I make the `get()` call efficient since we can definitely brute force and scan linearly each time but that would be `O(K * N)` where `K` is the number of calls of `get()` and `N` is the maximum number of elements in our store.

Notice how our condition is oddly familiar, lets use binary search! (I will just be coding up the binary search and not the whole solution)
```python
def binary_search(arr, timestamp):
  left = 0
  right = len(arr) - 1 # arr is what we get from dict[key]
  while left <= right:
    mid = left + ((right - left) // 2)
    if arr[mid][0] > timestamp:
      right = mid - 1
    else:
      left = mid + 1

  return right 
```

I won't repeat the explanation but we know that once the loop ends `right` is the last index where every value is `<= timestamp`

## Binary Search on Answer

Now what if we aren't given a sorted array to search through? Let us see Leetcode question [875. Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/description/)

We are given piles of bananas and `h` hours to finish them. Koko chooses an integer eating speed `k`, and each hour she eats up to `k` bananas from one pile. If she finishes that pile early, she waits until the next hour before starting another one. Our goal is to find the minimum speed that lets her finish in time.

Okay so we can just try every speed starting from `1` and return the first one that works. But how do we check whether a speed works?

### Checking a speed

For a pile with `7` bananas and a speed of `3`, Koko needs `3` hours. Even though the last hour only involves eating one banana, it still counts as a full hour.

So for each pile we divide its size by our speed and round up. We can do this with integer division:

```python
hours = (pile + speed - 1) // speed
```

We then add the hours for every pile and check if the total is `<= h`. We have to round up each pile separately because Koko cannot use the leftover time from one pile to start another.

### Finding the condition

Notice how if Koko can finish at a speed of `k`, she can also finish at any speed greater than `k`. Conversely, if a speed is too slow, every smaller speed will also be too slow.

Our condition therefore looks like this as the speed increases:

```text
Speed:       1      2      3      4     5     6    ...
Can finish: False  False  False  True  True  True  ...
```

This should look familiar. We are trying to find the first value that satisfies a condition, which is exactly what we did in lower bound binary search. The difference is that our search space now consists of possible answers instead of array indices. We don't even need to sort `piles`.

### Choosing our bounds

- `left = 1` because this is the smallest positive integer speed.
- `right = max(piles)` because at this speed every pile takes exactly one hour. The problem guarantees `h >= len(piles)`, so this speed will always work.

Trying every speed would take `O(N * M)` time, where `N` is the number of piles and `M` is the largest pile. Binary search lets us reduce the number of speeds we check to `O(log M)`.

### The solution

```python
class Solution:
  def minEatingSpeed(self, piles: list[int], h: int) -> int:
    left = 1
    right = max(piles)

    while left <= right:
      mid = left + ((right - left) // 2)
      hours = 0

      for pile in piles:
        hours += (pile + mid - 1) // mid

      if hours <= h:
        right = mid - 1
      else:
        left = mid + 1

    return left
```

Very similar skeleton again, just with a different check inside our loop:

- If `hours <= h`, our speed works, but a smaller speed might also work. So we move `right = mid - 1` and keep searching.
- If `hours > h`, our speed is too slow, so we move `left = mid + 1`.
- We don't return immediately when `hours == h`. A smaller speed might still take the same number of hours because we round up for each pile.
- Once the pointers cross, `left` is the first speed that works, so we return it.

### Walking through an example

Using `piles = [3, 6, 7, 11]` and `h = 8`, we start with `left = 1` and `right = 11`:

| left | right | mid (speed) | Hours needed | What we do |
| --- | --- | --- | --- | --- |
| 1 | 11 | 6 | 1 + 1 + 2 + 2 = 6 | Works, try slower: `right = 5` |
| 1 | 5 | 3 | 1 + 2 + 3 + 4 = 10 | Too slow: `left = 4` |
| 4 | 5 | 4 | 1 + 2 + 2 + 3 = 8 | Works, try slower: `right = 3` |

Now `left > right`, and we return `4`.

Each check scans all `N` piles, and we perform `O(log M)` checks. Including the initial scan for `max(piles)`, the runtime is `O(N log(M + 1))`, commonly written as `O(N log M)`. We only store a few variables, so the extra space is `O(1)`.

The main thing I look for here is whether a working answer guarantees that all larger answers also work. If that holds, and I can check a candidate efficiently, I can use binary search to find the first working answer.
