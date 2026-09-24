---
title: "Enumeration with Nmap."
date: "2026-09-23"
description: "First step into the cybersecurity rabbit hole."
lead: "My first HTB module!"
toc: true
topics: ["security", "redside", "learning"]
note: "Just some background: Have always been interested in the low-level details of computing but never pushed myself to explore them deeply apart from my academic coursework. Hence these posts are just a way for me to document my learning journey and to keep myself accountable."
---

In general, I think that this module can just be broken down into two parts: 'How Nmap links with networks' and 'How to deal with Firewalls/IDS/IPS' which I will explain further below. Lastly I'll end with my approach to the lab provided on HTB Enumeration with Nmap.

## 1. How Nmap links with networks

This module was a great introduction to how network exposure forms an important part of a system's attack surface, where a misconfigured or forgotten service can leave a system vulnerable to attack.

### What is Nmap

- A network scanning and enumeration tool that can perform host discovery, port scanning, service/version detection, OS fingerprinting etc
- Provides plenty of useful options to learn more about our target i.e  `-sV`, `-O`
- Provides access to the Nmap Scripting Engine (NSE), which allows us to run existing scripts or write our own, e.g. `--script vuln`.

### So why is it useful?

- Allows you to find open ports of the target which can then be investigated further
- Investigate discovered ports by first identifying and enumerating the service running on them. For example, port 80 commonly hosts HTTP, while port 21 commonly hosts FTP. Once the service is confirmed, enumerate its configuration and behaviour before forming hypotheses about possible weaknesses
- Or we can also identify the target's OS and service versions, then research whether the detected configuration or version has known weaknesses

### So networking?

- Nmap capitalises on networking protocols to get the information it needs.
- For example the stealth scan / half-open scan runs on TCP but instead of completing the full three-way handshake, we only send the `SYN` packet and hence not form a full connection (albeit modern IDSs can spot them easily today) but this could also give us valuable information of the target (more on that in section 2).
- We can also run a UDP scan on our target by using the `-sU` option of `nmap`, but why would you ever choose UDP when its _slower_ than TCP? Because some services use UDP, so a TCP-only scan may miss them. DNS, for example, commonly uses UDP/53, (although it can also use TCP/53)
  - UDP is connectionless and has no handshake. Depending on the service and probe, an open UDP port may respond or may remain silent. This can make it difficult for Nmap to distinguish between an open port and a probe that was silently dropped by a firewall. Hence nmap has to wait for a long timeout period and retransmit multiple probes in order to verify the port's state.
  - When you scan a closed UDP port, target sends back an `ICMP Destination Unreachable` error however OSes strictly rate-limit these ICMP error messages 

### Understanding Nmap Port States

Before moving on to firewall and IDS/IPS behaviour, it is useful to understand the different port states that Nmap can report.

| State            | Meaning                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`           | An application is actively accepting connections or packets on the port.                                                                                                  |
| `closed`         | The host is reachable, but there is currently no application listening on the port.                                                                                       |
| `filtered`       | Nmap cannot determine whether the port is open or closed because probes or responses appear to be blocked or dropped.                                                     |
| `open\|filtered` | Nmap cannot distinguish whether the port is open or being filtered. This is commonly encountered during UDP scans because an open UDP service may not respond to a probe. |
| `unfiltered`     | The port is reachable, but the scan being used cannot determine whether it is open or closed. This is commonly seen with ACK scans.                                       |

These states depend heavily on the type of scan being performed.

For example, during a TCP SYN scan:

```text
SYN → SYN/ACK
```

usually indicates that the port is `open`, while:

```text
SYN → RST
```

indicates that the port is `closed`.

If Nmap receives no response, or certain ICMP error messages, it may classify the port as `filtered`.

UDP behaves differently because there is no TCP-style handshake. A UDP probe may result in:

```text
UDP Probe → Application Response
```

which indicates that the port is `open`, or:

```text
UDP Probe → ICMP Port Unreachable
```

which generally indicates that the port is `closed`.

However, if there is no response at all, Nmap may report:

```text
open|filtered
```

because it cannot determine whether the UDP service is open but remained silent, or whether a firewall dropped the probe or response.

This is one of the reasons UDP enumeration can take significantly longer than TCP scanning.


## 2. How to deal with Firewalls/IDS/IPS

### First lets define the defences:
- Firewall
  - Core function: Examines network traffic (both incoming and outgoing) and applies preconfigured rules to either:
    - Allow/Drop packets based on criteria
    - Filter/Reject packets when no rule matches or when explicitly configured
  - The guard at the front of a bank.
- Intrusion Detection System (IDS)
  - Monitors traffic and devices for suspicious activity or policy violations and sends alerts to administrators 
  - The alarm and camera system.
- Intrusion Prevention System (IPS)
  - Monitors traffic for malicious activity and blocks it 
  - How it differs from a traditional firewall: an IPS focuses on detecting malicious or suspicious activity in traffic and can actively block it. Modern firewalls may also perform deeper inspection
  - The undercover bank detective.

### Okay, so how can we work on systems with these protections
- We can adjust how Nmap sends probes to reduce scan intensity and better understand filtering behaviour
  - Put a ceiling on how fast nmap can send packets: `--max-rate <limit>`
  - Cap the number of retries: `--max-retries <limit>`
  - Alter the timing template `-T0` to `-T5` where `-T5` is the most aggressive.
- We can utilise decoys or proxies
  - `-D RND:5` creates 5 random IP address senders along our own IP to cover our own tracks.
  - Take note our decoys should be alive and valid, why?
    - when Nmap sends the SYN/ACK back to the fake IP, there will be no response
    - target might retry the SYN/ACK
    - starts looking like a SYN flood, and trigger SYN flood protection or other defenses
    - On a side note: if all the decoys are unreachable and only your IP is reachable it is quite clear which is doing the scanning
  - `--source-port <port>` to change our source port or `--dns-servers <server>` to _change the DNS server to be used_
    - An internal DNS server would probably be more trusted than an external one
- Even if our scans are unsuccessful we can gain valuable insight
  - We can do a SYN scan and from the results learn if there is a firewall in place, `open`/`closed`/`filtered`
  
  ![firewall-syn-scan](../images/enumeration-with-nmap/firewall-syn-scan.png)
  - We can do an ACK scan, since there was no prior TCP connection and it wasn't a SYN packet, target responds with `RST` but this return tells us that the packet got through the firewall. (This gives us `unfiltered`)
   - However take note ACK scan only tells us `filtered` or `unfiltered` does not indicate if port is open/closed


## Hard Lab Write Up

Ran a stealth scan using a shorter timing template with 5 random decoys from source port 53
```
sudo nmap -sS -T2 -D RND:5 --source-port 53 <target ip>
```
Aborted halfway as target's IPS is very sensitive (From tracking website provided by target)

I reduced the scan rate further using `--max-rate 50` and limited retransmissions with `--max-retries 2`
![hard-lab1](../images/enumeration-with-nmap/hard-lab1.png)


Port 80 and 50000 are what I am most inclined to investigate further
```
sudo nmap -Pn -A -vv -sS -D RND:5 -T2 --source-port 53 -p 50000 <target ip>
```
![hardlab2](../images/enumeration-with-nmap/hardlab2.png)
![hardlab3](../images/enumeration-with-nmap/hardlab3.png)

got `tcpwrapped` as the response
- a designation used by network scanners like Nmap to indicate that a port completed a full TCP handshake, but the remote host closed the connection immediately without sending or receiving any data

Tried using `-sT` for a full TCP connect scan

![hardlab4](../images/enumeration-with-nmap/hardlab4.png)

Using Netcat
```
nc -nv <target ip> 50000
```
![hardlab5](../images/enumeration-with-nmap/hardlab5.png)

Tried again but using 53 (DNS server) as my source port
```
nc -nv -p 53 <target ip> 50000
```
![hardlab6](../images/enumeration-with-nmap/hardlab6.png)
