---
document_id: DOC-405
title: Deferred fire-control demo items
status: draft
owner: unresolved
created: 2026-09-18
updated: 2026-09-18
applies_to: desktop simulator
authority: informative
supersedes: null
related:
  - DOC-320
  - DOC-404
---

# Todo later

Work parked after designate-priority. AUTO stays the default fire mode. Do these one at a time, only when asked.

## 3. Split-raid at sector edges

Two clusters at opposite edges of the 120° northern sector (not 180°). Blueprint §10.1. A 180° split needs a trainable sector or a second radar; that is a product conversation, not a silent feature.

## 4. Hover-then-dive class

One class that parks (TTB = REC) then dives. Breaks “EDF always wins” without a new sensor. Today every track always closes.

## 5. Pd + coast + AUTO quality gate

Missed scans, coast between hits, drop after a miss streak. AUTO fires only on a confirmed track (hit-streak gate). MANUAL can still shoot a tentative. Turns 10 Hz into a simulated sensor; not fielded DSP. AUTO remains the default mode.

## Done (not later)

1. HUD: slew vs TTB + ENGAGED
2. Designate-priority (AUTO stays default)
