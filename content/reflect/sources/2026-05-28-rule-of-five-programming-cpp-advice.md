---
title: "Rule of Five #programming #cpp #advice"
summary: "Short YouTube video from FunnanSoftware using the Rule of Five to distinguish junior from senior C++ developers by tracing resource ownership to all five special member functions."
type: source
created: 2026-05-28
updated: 2026-05-28
subjects:
  - software-engineering
tags:
  - cpp
  - memory-management
  - rule-of-five
  - special-member-functions
  - interviewing
  - youtube
  - programming
  - resource-ownership
role: argument
views:
  - date: 2026-05-28
    note: "Initial cataloging."
confidence: high
---

A short-form YouTube video from [[reflect/entities/funnan-software]] making the case that knowledge of the [[reflect/concepts/rule-of-five-cpp]] is a meaningful signal for developer seniority. The presenter walks through the rule by deriving it from first principles — starting at the purpose of a destructor and arriving at all five special member functions through the logic of resource ownership.

## Core argument

A destructor's sole purpose is to release managed memory. Writing one is a declaration that the class owns a resource. That ownership obligation extends across all transfer and replication operations — the programmer must decide what copying and moving that resource means. Therefore: **if you define any one of the five, define all five.**

The five special member functions:
1. Destructor
2. Copy constructor
3. Move constructor
4. Copy assignment operator
5. Move assignment operator

## Interview framing

The video presents the Rule of Five as an interview benchmark. Junior developers typically don't know it — which the presenter considers acceptable — but uses the gap as a teaching opportunity, walking the candidate through the destructor → resource ownership → copy/move semantics chain. The rule is framed as something to derive, not merely recite.

[Download original](/api/originals/2026-05-28-rule-of-five-programming-cpp-advice.md)
