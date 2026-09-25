---
title: "0/1 Search?"
date: "2026-09-25"
description: "Binary Search is not that simple after all."
lead: "A thorough guide on a fundamental algorithm."
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
